/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject, type Subject } from 'rxjs';
import type {
  ElasticsearchClient,
  KibanaRequest,
  LoggerFactory,
  SavedObject,
  SavedObjectsCreateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsFindResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SecurityServiceStart,
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { DataStreamSamples } from '../../common';
import type { IntegrationAttributes, DataStreamAttributes } from './saved_objects/schemas/types';
import { AutomaticImportSamplesIndexService } from './samples_index/index_service';
import { getAuthenticatedUser } from './lib/get_user';
import { AutomaticImportSavedObjectService } from './saved_objects/saved_objects_service';
import { integrationSavedObjectType } from './saved_objects/integration';
import { dataStreamSavedObjectType } from './saved_objects/data_stream';

export class AutomaticImportService {
  private pluginStop$: Subject<void>;
  private samplesIndexService: AutomaticImportSamplesIndexService;
  private security: SecurityServiceStart | null = null;
  private savedObjectService: AutomaticImportSavedObjectService | null = null;
  private logger: LoggerFactory;
  private savedObjectsServiceSetup: SavedObjectsServiceSetup;

  constructor(
    logger: LoggerFactory,
    esClientPromise: Promise<ElasticsearchClient>,
    savedObjectsServiceSetup: SavedObjectsServiceSetup
  ) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = logger;
    this.savedObjectsServiceSetup = savedObjectsServiceSetup;
    this.samplesIndexService = new AutomaticImportSamplesIndexService(logger, esClientPromise);

    this.savedObjectsServiceSetup.registerType(integrationSavedObjectType);
    this.savedObjectsServiceSetup.registerType(dataStreamSavedObjectType);
  }

  // Run initialize in the start phase of plugin
  public async initialize(
    security: SecurityServiceStart,
    savedObjectsServiceStart: SavedObjectsServiceStart
  ): Promise<void> {
    this.security = security;
    const savedObjectsClient = savedObjectsServiceStart.createInternalRepository();
    this.savedObjectService = new AutomaticImportSavedObjectService(
      this.logger,
      savedObjectsClient,
      this.security
    );
  }

  public async addSamplesToDataStream(dataStream: DataStreamSamples, request: KibanaRequest) {
    if (!this.security) {
      throw new Error('Security service not initialized.');
    }
    const currentAuthenticatedUser = getAuthenticatedUser(request, this.security);
    await this.samplesIndexService.addSamplesToDataStream(currentAuthenticatedUser, dataStream);
  }

  public async insertIntegration(
    request: KibanaRequest,
    data: IntegrationAttributes,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObject<IntegrationAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.insertIntegration(request, data, options);
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

  public async getIntegration(integrationId: string): Promise<SavedObject<IntegrationAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.getIntegration(integrationId);
  }

  public async getAllIntegrations(): Promise<SavedObjectsFindResponse<IntegrationAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.getAllIntegrations();
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

  public async insertDataStream(
    request: KibanaRequest,
    data: DataStreamAttributes,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObject<DataStreamAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.insertDataStream(request, data, options);
  }

  public async updateDataStream(
    data: DataStreamAttributes,
    expectedVersion: string,
    versionUpdate?: 'major' | 'minor' | 'patch',
    options?: SavedObjectsUpdateOptions<DataStreamAttributes>
  ): Promise<SavedObjectsUpdateResponse<DataStreamAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.updateDataStream(data, expectedVersion, versionUpdate, options);
  }

  public async getDataStream(dataStreamId: string): Promise<SavedObject<DataStreamAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.getDataStream(dataStreamId);
  }

  public async getAllDataStreams(): Promise<SavedObjectsFindResponse<DataStreamAttributes>> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.getAllDataStreams();
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
    dataStreamId: string,
    options?: SavedObjectsDeleteOptions
  ): Promise<void> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.deleteDataStream(dataStreamId, options);
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
