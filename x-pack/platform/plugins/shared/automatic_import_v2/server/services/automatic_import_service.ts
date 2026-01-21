/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { ReplaySubject, type Subject } from 'rxjs';
import type {
  LoggerFactory,
  SavedObject,
  SavedObjectsDeleteOptions,
  SavedObjectsFindResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsServiceSetup,
  SavedObjectsClient,
  ElasticsearchClient,
  CoreSetup,
  KibanaRequest,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { IntegrationResponse, DataStreamResponse, TaskStatus, InputType } from '../../common';
import type { IntegrationAttributes, DataStreamAttributes } from './saved_objects/schemas/types';
import type { AddSamplesToDataStreamParams as SamplesToDataStreamParams } from './samples_index/index_service';
import { AutomaticImportSamplesIndexService } from './samples_index/index_service';
import { AutomaticImportSavedObjectService } from './saved_objects/saved_objects_service';
import { integrationSavedObjectType } from './saved_objects/integration';
import { dataStreamSavedObjectType } from './saved_objects/data_stream';
import type { DataStreamTaskParams } from './task_manager/task_manager_service';
import { TaskManagerService } from './task_manager/task_manager_service';
import type { CreateDataStreamParams, CreateIntegrationParams } from '../routes/types';
import { TASK_STATUSES } from './saved_objects/constants';
import { DATA_STREAM_CREATION_TASK_TYPE } from './task_manager';
import type { AutomaticImportV2PluginStartDependencies } from '../types';

export class AutomaticImportService {
  private pluginStop$: Subject<void>;
  private samplesIndexService: AutomaticImportSamplesIndexService;
  private savedObjectService: AutomaticImportSavedObjectService | null = null;
  private loggerFactory: LoggerFactory;
  private savedObjectsServiceSetup: SavedObjectsServiceSetup;
  private taskManagerSetup: TaskManagerSetupContract;
  private taskManagerService: TaskManagerService;

  constructor(
    loggerFactory: LoggerFactory,
    savedObjectsServiceSetup: SavedObjectsServiceSetup,
    taskManagerSetup: TaskManagerSetupContract,
    core: CoreSetup<AutomaticImportV2PluginStartDependencies>
  ) {
    this.pluginStop$ = new ReplaySubject(1);
    this.loggerFactory = loggerFactory;
    this.savedObjectsServiceSetup = savedObjectsServiceSetup;
    this.samplesIndexService = new AutomaticImportSamplesIndexService(loggerFactory);

    this.savedObjectsServiceSetup.registerType(integrationSavedObjectType);
    this.savedObjectsServiceSetup.registerType(dataStreamSavedObjectType);

    this.taskManagerSetup = taskManagerSetup;
    this.taskManagerService = new TaskManagerService(loggerFactory, this.taskManagerSetup, core);
  }

  // Run initialize in the start phase of plugin
  public async initialize(
    savedObjectsClient: SavedObjectsClient,
    taskManagerStart: TaskManagerStartContract
  ): Promise<void> {
    this.savedObjectService = new AutomaticImportSavedObjectService(
      this.loggerFactory,
      savedObjectsClient
    );
    this.taskManagerService.initialize(taskManagerStart, this.savedObjectService);
  }

  public async createIntegration(params: CreateIntegrationParams): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { authenticatedUser, integrationParams } = params;
    await this.savedObjectService.insertIntegration(integrationParams, authenticatedUser);
  }

  public async updateIntegration(
    data: IntegrationAttributes,
    expectedVersion: string,
    versionUpdate?: 'major' | 'minor' | 'patch',
    options?: SavedObjectsUpdateOptions<IntegrationAttributes>
  ): Promise<SavedObjectsUpdateResponse<IntegrationAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.updateIntegration(data, expectedVersion, versionUpdate, options);
  }

  public async getIntegrationById(integrationId: string): Promise<IntegrationResponse> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    const integrationSO = await this.savedObjectService.getIntegration(integrationId);
    const dataStreamsSO: DataStreamAttributes[] = await this.savedObjectService.getAllDataStreams(
      integrationId
    );

    const dataStreamsResponses: DataStreamResponse[] = dataStreamsSO.map((dataStream) => ({
      dataStreamId: dataStream.data_stream_id,
      title: dataStream.title,
      description: dataStream.description,
      inputTypes: dataStream.input_types.map((type) => ({ name: type })) as InputType[],
      status: dataStream.job_info.status as TaskStatus,
    }));

    const integrationResponse: IntegrationResponse = {
      integrationId: integrationSO.integration_id,
      title: integrationSO.metadata.title,
      logo: integrationSO.metadata.logo,
      description: integrationSO.metadata.description,
      status: integrationSO.status as TaskStatus,
      dataStreams: dataStreamsResponses,
    };
    return integrationResponse;
  }

  public async getAllIntegrations(): Promise<IntegrationResponse[]> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    const integrations = await this.savedObjectService.getAllIntegrations();
    return Promise.all(
      integrations.map(async (integration) => {
        const dataStreams = await this.savedObjectService!.getAllDataStreams(
          integration.integration_id
        );
        const dataStreamsResponses: DataStreamResponse[] = dataStreams.map((dataStream) => ({
          dataStreamId: dataStream.data_stream_id,
          title: dataStream.title,
          description: dataStream.description,
          inputTypes: dataStream.input_types.map((type) => ({ name: type })) as InputType[],
          status: dataStream.job_info.status as TaskStatus,
        }));
        return {
          integrationId: integration.integration_id,
          title: integration.metadata.title,
          logo: integration.metadata.logo,
          description: integration.metadata.description,
          status: integration.status as TaskStatus,
          dataStreams: dataStreamsResponses,
        };
      })
    );
  }

  public async deleteIntegration(
    integrationId: string,
    options?: SavedObjectsDeleteOptions
  ): Promise<{
    success: boolean;
    dataStreamsDeleted: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.deleteIntegration(integrationId, options);
  }

  public async createDataStream(
    params: CreateDataStreamParams,
    request: KibanaRequest
  ): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { authenticatedUser, dataStreamParams, connectorId } = params;

    // Schedule the data stream creation background task
    const dataStreamTaskParams: DataStreamTaskParams = {
      integrationId: dataStreamParams.integrationId,
      dataStreamId: dataStreamParams.dataStreamId,
      connectorId,
    };
    const { taskId } = await this.taskManagerService.scheduleDataStreamCreationTask(
      dataStreamTaskParams,
      request
    );

    // Insert the data stream in saved object
    await this.savedObjectService.insertDataStream(
      {
        ...dataStreamParams,
        jobInfo: {
          jobId: taskId,
          status: TASK_STATUSES.pending,
          jobType: DATA_STREAM_CREATION_TASK_TYPE,
        },
      },
      authenticatedUser
    );
  }

  public async getDataStream(
    dataStreamId: string,
    integrationId: string
  ): Promise<SavedObject<DataStreamAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.getDataStream(dataStreamId, integrationId);
  }

  public async getAllDataStreams(integrationId: string): Promise<DataStreamAttributes[]> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    const dataStreams = await this.savedObjectService.getAllDataStreams(integrationId);
    return dataStreams.map((dataStream) => ({
      data_stream_id: dataStream.data_stream_id,
      integration_id: integrationId,
      created_by: dataStream.created_by,
      title: dataStream.title,
      description: dataStream.description,
      input_types: dataStream.input_types,
      status: dataStream.job_info.status,
      job_info: dataStream.job_info,
      metadata: dataStream.metadata,
    }));
  }

  public async findAllDataStreamsByIntegrationId(
    integrationId: string
  ): Promise<SavedObjectsFindResponse<DataStreamAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.findAllDataStreamsByIntegrationId(integrationId);
  }

  public async deleteDataStream(
    integrationId: string,
    dataStreamId: string,
    esClient: ElasticsearchClient,
    options?: SavedObjectsDeleteOptions
  ): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    // Remove the data stream creation task
    await this.taskManagerService.removeDataStreamCreationTask({
      integrationId,
      dataStreamId,
    });
    // Delete the samples from the samples index
    await this.samplesIndexService.deleteSamplesForDataStream(
      integrationId,
      dataStreamId,
      esClient
    );
    // Delete the data stream from the saved objects
    await this.savedObjectService.deleteDataStream(integrationId, dataStreamId, options);
  }

  public async addSamplesToDataStream(
    params: SamplesToDataStreamParams
  ): Promise<ReturnType<typeof this.samplesIndexService.addSamplesToDataStream>> {
    return this.samplesIndexService.addSamplesToDataStream(params);
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
