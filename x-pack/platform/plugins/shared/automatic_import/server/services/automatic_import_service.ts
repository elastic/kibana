/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { ReplaySubject, type Subject } from 'rxjs';
import type {
  AnalyticsServiceSetup,
  Logger,
  LoggerFactory,
  SavedObject,
  SavedObjectsDeleteOptions,
  SavedObjectsFindResponse,
  SavedObjectsServiceSetup,
  SavedObjectsClient,
  ElasticsearchClient,
  CoreSetup,
  KibanaRequest,
} from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { Pipeline } from '@kbn/ingest-pipelines-plugin/common/types';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type {
  IntegrationResponse,
  DataStreamResponse,
  TaskStatus,
  InputType,
  DataStreamResults,
  FieldTypeChange,
  FieldTypeError,
} from '../../common';
import { canEditDataStreamFieldTypes } from '../../common';
import type {
  IntegrationAttributes,
  DataStreamAttributes,
  ChangelogEntry,
  FieldTypeOverride,
} from './saved_objects/schemas/types';
import type { AddSamplesToDataStreamParams as SamplesToDataStreamParams } from './samples_index/index_service';
import { AutomaticImportSamplesIndexService } from './samples_index/index_service';
import type { FieldMappingEntry, IntegrationName } from './saved_objects/saved_objects_service';
import { AutomaticImportSavedObjectService } from './saved_objects/saved_objects_service';
import { integrationSavedObjectType } from './saved_objects/integration';
import { dataStreamSavedObjectType } from './saved_objects/data_stream';
import type { DataStreamTaskParams } from './task_manager/task_manager_service';
import { TaskManagerService } from './task_manager/task_manager_service';
import type {
  ApproveIntegrationParams,
  CreateDataStreamParams,
  CreateUpdateIntegrationParams,
} from '../routes/types';
import { TASK_STATUSES } from './saved_objects/constants';
import type { BuildIntegrationPackageResult } from './build_integration/build_integration_service';
import { buildIntegrationPackage } from './build_integration/build_integration_service';
import { generateFieldMappings } from './build_integration/fields';
import { validateFieldMappings } from './build_integration/validate_fields';
import {
  applyFieldTypeOverrides,
  collectRuleErrors,
  mergeFieldTypeChanges,
} from './field_types/field_type_overrides';

const MAX_PERSISTED_PREVIEW_DOCUMENTS = 100;
const MAX_INGEST_PIPELINE_PROCESSORS = 10_000;

/**
 * Derives the integration status from its data streams.
 * - 'failed' if integration previously had data streams but all were deleted
 * - 'approved' if all data streams are completed and there is at least one
 * - 'completed' if all data streams are completed
 * - 'failed' if any data stream has failed
 * - 'processing' if any data stream is processing
 * - 'pending' otherwise (no data streams or all pending)
 */
function deriveIntegrationStatus(
  integration: IntegrationAttributes,
  dataStreams: DataStreamAttributes[]
): TaskStatus {
  if (dataStreams.length === 0) {
    return 'failed' as TaskStatus;
  }

  const statuses = dataStreams.map((ds) => ds.job_info?.status);

  if (statuses.some((s) => s === TASK_STATUSES.failed)) {
    return 'failed' as TaskStatus;
  }
  if (statuses.some((s) => s === TASK_STATUSES.processing)) {
    return 'processing' as TaskStatus;
  }
  if (statuses.every((s) => s === TASK_STATUSES.completed)) {
    if (integration.status === TASK_STATUSES.approved) {
      return 'approved' as TaskStatus;
    }
    return 'completed' as TaskStatus;
  }
  return 'pending' as TaskStatus;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const unwrapPipelineDoc = (doc: unknown): Record<string, unknown> | undefined => {
  if (!isPlainObject(doc)) {
    return undefined;
  }
  if (isPlainObject(doc._source)) {
    return doc._source;
  }
  if (isPlainObject(doc.doc) && isPlainObject(doc.doc._source)) {
    return doc.doc._source;
  }
  return doc;
};

const getLastApprovedDataStreamIdsFromMetadata = (
  integration: IntegrationAttributes,
  dataStreams: DataStreamAttributes[]
): string[] | undefined => {
  const stamped = integration.metadata.last_approved_data_stream_ids;
  if (Array.isArray(stamped)) {
    return stamped.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  const wasApproved =
    integration.status === TASK_STATUSES.approved || (integration.changelog?.length ?? 0) > 0;
  if (!wasApproved) {
    return undefined;
  }

  // Legacy approved integrations receive this conservative snapshot once on read.
  return dataStreams.map((dataStream) => dataStream.data_stream_id);
};

/**
 * The job phase is only meaningful while a data stream is still being generated. For terminal
 * statuses (completed, failed, cancelled) the stored phase is stale, so we filter it out here in
 * code rather than mutating the saved object to clear it.
 */
function getInProgressPhase(jobInfo: DataStreamAttributes['job_info']): string | undefined {
  const isInProgress =
    jobInfo.status === TASK_STATUSES.pending || jobInfo.status === TASK_STATUSES.processing;
  return isInProgress ? jobInfo.phase : undefined;
}

interface ElasticsearchErrorDetails {
  reason?: string;
  caused_by?: ElasticsearchErrorDetails;
  root_cause?: ElasticsearchErrorDetails[];
}

interface ElasticsearchErrorLike {
  message?: string;
  body?: {
    error?: ElasticsearchErrorDetails;
  };
  meta?: {
    body?: {
      error?: ElasticsearchErrorDetails;
    };
  };
}

function getElasticsearchErrorReason(error: Error | ElasticsearchErrorLike): string {
  const errorLike = error as ElasticsearchErrorLike;
  const esError = errorLike.meta?.body?.error ?? errorLike.body?.error;
  const rootCauseReason = esError?.root_cause?.[0]?.reason;
  const causedByReason = esError?.caused_by?.reason;
  const directReason = esError?.reason;

  return rootCauseReason ?? causedByReason ?? directReason ?? errorLike.message ?? 'Unknown error';
}
import { DATA_STREAM_CREATION_TASK_TYPE } from './task_manager';
import { ErrorUtils } from '../errors/util';
import { FieldTypesLockedError, InvalidFieldTypeChangeError } from '../errors';
import type { AutomaticImportPluginStartDependencies } from '../types';

export type UpdateDataStreamFieldTypesResult =
  | ({ status: 'saved' } & DataStreamResults)
  | { status: 'failure'; errors: FieldTypeError[] };

function bumpMinorVersion(version: string): string {
  const parts = version.split('.').map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  return `${major}.${minor + 1}.0`;
}

export class AutomaticImportService {
  private pluginStop$: Subject<void>;
  private samplesIndexService: AutomaticImportSamplesIndexService;
  private savedObjectService: AutomaticImportSavedObjectService | null = null;
  private loggerFactory: LoggerFactory;
  private savedObjectsServiceSetup: SavedObjectsServiceSetup;
  private taskManagerSetup: TaskManagerSetupContract;
  private taskManagerService: TaskManagerService;
  private logger: Logger;
  constructor(
    loggerFactory: LoggerFactory,
    savedObjectsServiceSetup: SavedObjectsServiceSetup,
    taskManagerSetup: TaskManagerSetupContract,
    core: CoreSetup<AutomaticImportPluginStartDependencies>,
    analytics: AnalyticsServiceSetup
  ) {
    this.pluginStop$ = new ReplaySubject(1);
    this.loggerFactory = loggerFactory;
    this.logger = loggerFactory.get('automaticImportService');
    this.savedObjectsServiceSetup = savedObjectsServiceSetup;
    this.samplesIndexService = new AutomaticImportSamplesIndexService(loggerFactory);

    this.savedObjectsServiceSetup.registerType(integrationSavedObjectType);
    this.savedObjectsServiceSetup.registerType(dataStreamSavedObjectType);

    this.taskManagerSetup = taskManagerSetup;
    this.taskManagerService = new TaskManagerService(
      loggerFactory,
      this.taskManagerSetup,
      core,
      analytics,
      this.samplesIndexService
    );
  }

  // Run initialize in the start phase of plugin
  public async initialize(
    savedObjectsClient: SavedObjectsClient,
    taskManagerStart: TaskManagerStartContract,
    internalEsClient: ElasticsearchClient
  ): Promise<void> {
    this.savedObjectService = new AutomaticImportSavedObjectService(
      this.loggerFactory,
      savedObjectsClient
    );
    this.taskManagerService.initialize(taskManagerStart, this.savedObjectService);
    this.samplesIndexService.initialize(internalEsClient);
  }

  public async createUpdateIntegration(params: CreateUpdateIntegrationParams): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { authenticatedUser, integrationParams } = params;

    try {
      await this.savedObjectService.insertIntegration(integrationParams, authenticatedUser);
      this.logger.debug(`Integration ${integrationParams.integrationId} created successfully`);
    } catch (error) {
      if (ErrorUtils.isIntegrationAlreadyExistsError(error)) {
        this.logger.debug(
          `Integration ${integrationParams.integrationId} already exists, updating it`
        );
        const existing = await this.savedObjectService.getIntegration(
          integrationParams.integrationId
        );
        const currentVersion = existing.metadata?.version || '0.1.0';
        const wasApproved = existing.status === TASK_STATUSES.approved;
        const newVersion = wasApproved ? bumpMinorVersion(currentVersion) : currentVersion;

        const updateData: IntegrationAttributes = {
          ...existing,
          last_updated_by: authenticatedUser.username,
          last_updated_at: new Date().toISOString(),
          status: wasApproved ? TASK_STATUSES.completed : existing.status,
          ...(integrationParams.connectorId != null
            ? { connector_id: integrationParams.connectorId }
            : {}),
          metadata: {
            ...existing.metadata,
            version: newVersion,
            ...(integrationParams.title ? { title: integrationParams.title } : {}),
            ...(integrationParams.description
              ? { description: integrationParams.description }
              : {}),
            ...(integrationParams.logo ? { logo: integrationParams.logo } : {}),
          },
        };

        await this.savedObjectService.updateIntegration(updateData, newVersion);
        this.logger.debug(`Integration ${integrationParams.integrationId} updated successfully`);
      } else {
        throw error;
      }
    }
  }

  public async getIntegrationById(integrationId: string): Promise<IntegrationResponse> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    const integrationSO = await this.savedObjectService.getIntegration(integrationId);
    const dataStreamsSO: DataStreamAttributes[] = await this.savedObjectService.getAllDataStreams(
      integrationId
    );

    const dataStreamsResponses: DataStreamResponse[] = dataStreamsSO.map((dataStream) => {
      const phase = getInProgressPhase(dataStream.job_info);
      return {
        dataStreamId: dataStream.data_stream_id,
        title: dataStream.title,
        description: dataStream.description,
        inputTypes: dataStream.input_types.map((type) => ({ name: type })) as InputType[],
        status: dataStream.job_info.status as TaskStatus,
        ...(phase ? { phase } : {}),
      };
    });

    const lastApprovedDataStreamIds = getLastApprovedDataStreamIdsFromMetadata(
      integrationSO,
      dataStreamsSO
    );
    const integrationResponse: IntegrationResponse = {
      integrationId: integrationSO.integration_id,
      title: integrationSO.metadata.title,
      logo: integrationSO.metadata.logo,
      description: integrationSO.metadata.description,
      version: integrationSO.metadata.version,
      connectorId: integrationSO.connector_id,
      createdBy: integrationSO.created_by,
      createdByProfileUid: integrationSO.created_by_profile_uid,
      status: deriveIntegrationStatus(integrationSO, dataStreamsSO),
      dataStreams: dataStreamsResponses,
      categories: integrationSO.metadata.categories,
      ...(lastApprovedDataStreamIds ? { lastApprovedDataStreamIds } : {}),
    };
    return integrationResponse;
  }

  public async getAllIntegrationNames(): Promise<IntegrationName[]> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    return this.savedObjectService.getAllIntegrationNames();
  }

  public async getAllIntegrations(): Promise<IntegrationResponse[]> {
    if (!this.savedObjectService) {
      throw new Error('Saved Objects service not initialized.');
    }
    const savedObjectService = this.savedObjectService;
    const integrations = await savedObjectService.getAllIntegrations();
    return Promise.all(
      integrations.map(async (integration) => {
        const dataStreams = await savedObjectService.getAllDataStreams(integration.integration_id);
        const dataStreamsResponses: DataStreamResponse[] = dataStreams.map((dataStream) => {
          const phase = getInProgressPhase(dataStream.job_info);
          return {
            dataStreamId: dataStream.data_stream_id,
            title: dataStream.title,
            description: dataStream.description,
            inputTypes: dataStream.input_types.map((type) => ({ name: type })) as InputType[],
            status: dataStream.job_info.status as TaskStatus,
            ...(phase ? { phase } : {}),
          };
        });
        return {
          integrationId: integration.integration_id,
          title: integration.metadata.title,
          logo: integration.metadata.logo,
          description: integration.metadata.description,
          version: integration.metadata.version,
          connectorId: integration.connector_id,
          createdBy: integration.created_by,
          createdByProfileUid: integration.created_by_profile_uid,
          status: deriveIntegrationStatus(integration, dataStreams),
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
    assert(this.savedObjectService, 'Saved Objects service not initialized.');

    const dataStreams = await this.savedObjectService.getAllDataStreams(integrationId);

    for (const ds of dataStreams) {
      try {
        await this.taskManagerService.removeDataStreamCreationTask({
          integrationId,
          dataStreamId: ds.data_stream_id,
        });
      } catch (error) {
        this.logger.error(
          `Failed to remove task for data stream ${ds.data_stream_id} during integration delete: ${error}`
        );
      }

      try {
        await this.samplesIndexService.deleteSamplesForDataStream(integrationId, ds.data_stream_id);
      } catch (error) {
        this.logger.error(
          `Failed to delete samples for data stream ${ds.data_stream_id} during integration delete: ${error}`
        );
      }
    }

    return this.savedObjectService.deleteIntegration(integrationId, options);
  }

  public async approveIntegration(params: ApproveIntegrationParams): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { integrationId, authenticatedUser, version, categories } = params;

    const existing = await this.savedObjectService.getIntegration(integrationId);

    const dataStreams = await this.savedObjectService.getAllDataStreams(integrationId);
    if (dataStreams.length === 0) {
      throw new Error(`Cannot approve integration ${integrationId} with no data streams`);
    }
    const hasIncompleteDataStreams = dataStreams.some(
      (dataStream) => dataStream.job_info?.status !== TASK_STATUSES.completed
    );
    if (hasIncompleteDataStreams) {
      throw new Error(
        `Cannot approve integration ${integrationId} until all data streams are completed`
      );
    }

    const title = existing.metadata?.title ?? integrationId;
    const changelogEntry = this.createChangelogEntry(version, title, existing.changelog);
    const lastApprovedDataStreamIds = dataStreams
      .map((dataStream) => dataStream.data_stream_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const updateData: IntegrationAttributes = {
      ...existing,
      last_updated_by: authenticatedUser.username,
      last_updated_at: new Date().toISOString(),
      status: TASK_STATUSES.approved,
      metadata: {
        ...existing.metadata,
        categories,
        last_approved_data_stream_ids: lastApprovedDataStreamIds,
      },
      changelog: [changelogEntry, ...(existing.changelog ?? [])],
    };

    await this.savedObjectService.updateIntegration(updateData, version);
  }

  public async buildIntegrationPackage(
    integrationId: string,
    fieldsMetadataClient: IFieldsMetadataClient
  ): Promise<BuildIntegrationPackageResult> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const integration = await this.savedObjectService.getIntegration(integrationId);
    const dataStreams = await this.savedObjectService.getAllDataStreams(integrationId);
    return buildIntegrationPackage(integration, dataStreams, fieldsMetadataClient);
  }

  public async createDataStream(
    params: CreateDataStreamParams,
    request: KibanaRequest
  ): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { authenticatedUser, dataStreamParams, connectorId, langSmithOptions, integrationName } =
      params;

    // Schedule the data stream creation background task
    const dataStreamTaskParams: DataStreamTaskParams = {
      integrationId: dataStreamParams.integrationId,
      dataStreamId: dataStreamParams.dataStreamId,
      connectorId,
      integrationName,
      dataStreamName: dataStreamParams.title,
      ...(langSmithOptions ? { langSmithOptions } : {}),
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
    options?: SavedObjectsDeleteOptions
  ): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    // Mark the data stream as deleting first so we can track if deletion is in progress
    await this.savedObjectService.updateDataStreamStatus(
      dataStreamId,
      integrationId,
      TASK_STATUSES.deleting
    );

    try {
      await this.taskManagerService.removeDataStreamCreationTask({
        integrationId,
        dataStreamId,
      });
    } catch (error) {
      this.logger.error(`Failed to remove task for data stream ${dataStreamId}: ${error}`);
    }

    try {
      await this.samplesIndexService.deleteSamplesForDataStream(integrationId, dataStreamId);
    } catch (error) {
      this.logger.error(`Failed to delete samples for data stream ${dataStreamId}: ${error}`);
    }

    await this.savedObjectService.deleteDataStream(dataStreamId, integrationId, options);

    const integration = await this.savedObjectService.getIntegration(integrationId);
    const approvedIds = integration.metadata?.last_approved_data_stream_ids;
    if (approvedIds?.includes(dataStreamId)) {
      await this.savedObjectService.updateIntegration(
        {
          ...integration,
          metadata: {
            ...integration.metadata,
            last_approved_data_stream_ids: approvedIds.filter((id) => id !== dataStreamId),
          },
        },
        integration.metadata?.version ?? '0.1.0'
      );
    }

    await this.resetApprovedStatus(integrationId);
  }

  public async reanalyzeDataStream(
    params: {
      integrationId: string;
      dataStreamId: string;
      connectorId: string;
      langSmithOptions?: { projectName: string; apiKey: string };
    },
    request: KibanaRequest
  ): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { integrationId, dataStreamId, connectorId, langSmithOptions } = params;

    // Fetch names for telemetry and existing logic
    const integration = await this.savedObjectService.getIntegration(integrationId);
    const dataStream = await this.savedObjectService.getDataStream(dataStreamId, integrationId);
    const integrationName = integration.metadata.title;
    const dataStreamName = dataStream.attributes.title;

    // Ensure the task is no longer running (useful for API scripts)
    await this.taskManagerService.removeDataStreamCreationTask({
      integrationId,
      dataStreamId,
    });

    const { taskId } = await this.taskManagerService.scheduleDataStreamCreationTask(
      {
        integrationId,
        dataStreamId,
        connectorId,
        integrationName,
        dataStreamName,
        langSmithOptions,
      },
      request
    );

    await this.savedObjectService.resetDataStreamForReanalysis({
      integrationId,
      dataStreamId,
      newTaskId: taskId,
      jobType: DATA_STREAM_CREATION_TASK_TYPE,
    });

    if (integration.status === TASK_STATUSES.approved) {
      const currentVersion = integration.metadata?.version || '0.1.0';
      const newVersion = bumpMinorVersion(currentVersion);

      const updateData: IntegrationAttributes = {
        ...integration,
        status: TASK_STATUSES.completed,
        metadata: {
          ...integration.metadata,
          version: newVersion,
        },
      };

      await this.savedObjectService.updateIntegration(updateData, newVersion);
      this.logger.debug(
        `Integration ${integrationId} status reset from approved to completed, version bumped to ${newVersion}`
      );
    }

    this.logger.debug(`Data stream ${dataStreamId} scheduled for reanalysis with task ${taskId}`);
  }

  public async addSamplesToDataStream(
    params: SamplesToDataStreamParams
  ): Promise<ReturnType<typeof this.samplesIndexService.addSamplesToDataStream>> {
    return this.samplesIndexService.addSamplesToDataStream(params);
  }

  public async getDataStreamResults(
    integrationId: string,
    dataStreamId: string
  ): Promise<DataStreamResults> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const dataStreamSO = await this.savedObjectService.getDataStream(dataStreamId, integrationId);
    assert(
      dataStreamSO.version,
      `Data stream ${dataStreamId} is missing its saved object version.`
    );
    const status = dataStreamSO.attributes.job_info?.status;

    if (status === TASK_STATUSES.failed) {
      throw new Error(`Data stream ${dataStreamId} failed and has no results`);
    }
    if (status !== TASK_STATUSES.completed) {
      throw new Error(`Data stream ${dataStreamId} has not completed yet`);
    }

    this.logger.debug(
      `Data stream ${dataStreamId} results: ${JSON.stringify(dataStreamSO.attributes.result)}`
    );

    const ingestPipelineObj = dataStreamSO.attributes.result?.ingest_pipeline ?? {};
    const results = (dataStreamSO.attributes.result?.pipeline_docs ?? [])
      .map((doc) => unwrapPipelineDoc(doc))
      .filter((doc): doc is Record<string, unknown> => doc !== undefined);
    const fieldMapping = dataStreamSO.attributes.result?.field_mapping ?? [];

    if (!ingestPipelineObj) {
      throw new Error(`Data stream ${dataStreamId} has no ingest pipeline results`);
    }

    return {
      ingest_pipeline: ingestPipelineObj,
      results,
      field_mapping: fieldMapping,
      field_type_overrides: dataStreamSO.attributes.field_type_overrides ?? [],
      version: dataStreamSO.version,
    };
  }

  public async updateDataStreamPipeline(params: {
    integrationId: string;
    dataStreamId: string;
    ingestPipeline: string | Record<string, unknown>;
    version: string;
    esClient: ElasticsearchClient;
    fieldsMetadataClient: IFieldsMetadataClient;
  }): Promise<DataStreamResults> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { integrationId, dataStreamId, ingestPipeline, version, esClient, fieldsMetadataClient } =
      params;

    let pipelineObject: unknown;
    try {
      pipelineObject =
        typeof ingestPipeline === 'string'
          ? (JSON.parse(ingestPipeline) as unknown)
          : ingestPipeline;
    } catch (e) {
      throw new Error(`Invalid ingest pipeline JSON: ${(e as Error).message}`);
    }

    if (!isPlainObject(pipelineObject)) {
      throw new Error('Invalid ingest pipeline: expected a JSON object');
    }
    const parsedPipeline = pipelineObject as unknown as Pipeline;
    if (!Array.isArray(parsedPipeline.processors)) {
      throw new Error('Invalid ingest pipeline: "processors" must be an array');
    }
    if (parsedPipeline.processors.length > MAX_INGEST_PIPELINE_PROCESSORS) {
      throw new Error(
        `Invalid ingest pipeline: "processors" must contain at most ${MAX_INGEST_PIPELINE_PROCESSORS} entries`
      );
    }
    if (!parsedPipeline.processors.every(isPlainObject)) {
      throw new Error('Invalid ingest pipeline: every processor must be an object');
    }

    const dataStreamSO = await this.savedObjectService.getDataStream(dataStreamId, integrationId);
    const applied = await this.applyFieldTypeOverridesToPipeline({
      pipeline: parsedPipeline,
      overrides: dataStreamSO.attributes.field_type_overrides ?? [],
      persistedFieldMapping: dataStreamSO.attributes.result?.field_mapping ?? [],
      integrationId,
      dataStreamId,
      esClient,
      fieldsMetadataClient,
    });
    if (applied.status === 'failure') {
      const fieldNames = applied.errors.map(({ name }) => name).join(', ');
      throw new InvalidFieldTypeChangeError(
        `Field type overrides are no longer valid for: ${fieldNames}`
      );
    }

    await this.savedObjectService.updateDataStreamSavedObjectAttributes({
      integrationId,
      dataStreamId,
      expectedVersion: version,
      ingestPipeline: applied.ingestPipeline,
      pipelineDocs: applied.pipelineDocs,
      fieldMapping: applied.fieldMapping,
      fieldTypeOverrides: applied.overrides,
      status: TASK_STATUSES.completed,
    });

    await this.resetApprovedStatus(integrationId);

    return this.getDataStreamResults(integrationId, dataStreamId);
  }

  /**
   * Checks field type changes against the samples using the same pipeline simulate as
   * `updateDataStreamPipeline`, and saves them only when every changed field passes.
   */
  public async updateDataStreamFieldTypes(params: {
    integrationId: string;
    dataStreamId: string;
    changes: FieldTypeChange[];
    version: string;
    esClient: ElasticsearchClient;
    fieldsMetadataClient: IFieldsMetadataClient;
  }): Promise<UpdateDataStreamFieldTypesResult> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const { integrationId, dataStreamId, changes, version, esClient, fieldsMetadataClient } =
      params;

    const dataStreamSO = await this.savedObjectService.getDataStream(dataStreamId, integrationId);
    const { job_info: jobInfo, result } = dataStreamSO.attributes;
    if (jobInfo?.status !== TASK_STATUSES.completed || !result?.ingest_pipeline) {
      throw new Error(`Data stream ${dataStreamId} has not completed yet`);
    }

    await this.assertFieldTypesEditable(integrationId, dataStreamId);

    const { overrides, reverted } = mergeFieldTypeChanges(
      result.field_mapping ?? [],
      dataStreamSO.attributes.field_type_overrides ?? [],
      changes
    );

    const applied = await this.applyFieldTypeOverridesToPipeline({
      pipeline: result.ingest_pipeline as Pipeline,
      overrides,
      reverted,
      persistedFieldMapping: result.field_mapping ?? [],
      integrationId,
      dataStreamId,
      esClient,
      fieldsMetadataClient,
    });
    if (applied.status === 'failure') {
      return { status: 'failure', errors: applied.errors };
    }

    await this.assertFieldTypesEditable(integrationId, dataStreamId);
    await this.savedObjectService.updateDataStreamSavedObjectAttributes({
      integrationId,
      dataStreamId,
      expectedVersion: version,
      ingestPipeline: applied.ingestPipeline,
      pipelineDocs: applied.pipelineDocs,
      fieldMapping: applied.fieldMapping,
      fieldTypeOverrides: applied.overrides,
      status: TASK_STATUSES.completed,
    });

    await this.resetApprovedStatus(integrationId);

    return {
      status: 'saved',
      ...(await this.getDataStreamResults(integrationId, dataStreamId)),
    };
  }

  /**
   * Checks high-confidence compatibility and mapping errors without persisting.
   */
  private async applyFieldTypeOverridesToPipeline(params: {
    pipeline: Pipeline;
    overrides: FieldTypeOverride[];
    reverted?: Array<{ name: string; originalType: string }>;
    persistedFieldMapping: FieldMappingEntry[];
    integrationId: string;
    dataStreamId: string;
    esClient: ElasticsearchClient;
    fieldsMetadataClient: IFieldsMetadataClient;
  }): Promise<
    | { status: 'failure'; errors: FieldTypeError[] }
    | {
        status: 'ok';
        ingestPipeline: Pipeline;
        pipelineDocs: Array<Record<string, unknown>>;
        fieldMapping: FieldMappingEntry[];
        overrides: FieldTypeOverride[];
      }
  > {
    const {
      pipeline,
      overrides,
      reverted = [],
      persistedFieldMapping,
      dataStreamId,
      esClient,
      fieldsMetadataClient,
    } = params;
    const samples = await this.getSamplesOrThrow(params.integrationId, dataStreamId);

    const basePipeline = pipeline;
    const baseDocuments = await this.simulatePipelineOnSamples(esClient, basePipeline, samples);

    const ruleErrors = collectRuleErrors(overrides, baseDocuments);
    if (ruleErrors.length > 0) {
      return { status: 'failure', errors: ruleErrors };
    }

    const allPipelineDocs = baseDocuments.filter(
      (source): source is Record<string, unknown> => source !== undefined
    );
    const { fieldMapping, overrides: savedOverrides } = applyFieldTypeOverrides(
      await generateFieldMappings(allPipelineDocs, fieldsMetadataClient),
      overrides,
      reverted,
      persistedFieldMapping
    );

    await this.assertValidFieldMappings(esClient, fieldMapping, dataStreamId);

    return {
      status: 'ok',
      ingestPipeline: basePipeline,
      pipelineDocs: allPipelineDocs.slice(0, MAX_PERSISTED_PREVIEW_DOCUMENTS),
      fieldMapping,
      overrides: savedOverrides,
    };
  }

  private async assertFieldTypesEditable(
    integrationId: string,
    dataStreamId: string
  ): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const integration = await this.savedObjectService.getIntegration(integrationId);
    const dataStreams = await this.savedObjectService.getAllDataStreams(integrationId);
    const lastApprovedDataStreamIds = getLastApprovedDataStreamIdsFromMetadata(
      integration,
      dataStreams
    );
    if (!canEditDataStreamFieldTypes({ dataStreamId, lastApprovedDataStreamIds })) {
      throw new FieldTypesLockedError(
        `Field types for data stream ${dataStreamId} are locked because it is part of the last approved package`
      );
    }
  }

  private async getSamplesOrThrow(integrationId: string, dataStreamId: string): Promise<string[]> {
    const samples = await this.samplesIndexService.getSamplesForDataStream(
      integrationId,
      dataStreamId
    );
    if (samples.length === 0) {
      throw new Error(`No samples found for data stream ${dataStreamId}`);
    }
    return samples;
  }

  /**
   * Runs the pipeline over the samples as the current user. The result keeps one entry per sample,
   * in order, with `undefined` for samples the pipeline failed on.
   */
  private async simulatePipelineOnSamples(
    esClient: ElasticsearchClient,
    pipeline: Pipeline,
    samples: string[]
  ): Promise<Array<Record<string, unknown> | undefined>> {
    let simulateResponse: estypes.IngestSimulateResponse;
    try {
      simulateResponse = await esClient.ingest.simulate({
        pipeline: pipeline as unknown as estypes.IngestPipeline,
        docs: samples.map((sample) => ({
          _source: { message: sample },
        })),
      });
    } catch (e) {
      throw new Error(
        `Invalid ingest pipeline: ${getElasticsearchErrorReason(
          e as Error | ElasticsearchErrorLike
        )}`
      );
    }

    return (simulateResponse.docs ?? []).map(
      (doc) => doc?.doc?._source as Record<string, unknown> | undefined
    );
  }

  private async assertValidFieldMappings(
    esClient: ElasticsearchClient,
    fieldMapping: FieldMappingEntry[],
    dataStreamId: string
  ): Promise<void> {
    const validationResult = await validateFieldMappings(esClient, fieldMapping, this.logger);
    if (!validationResult.valid) {
      throw new InvalidFieldTypeChangeError(
        `Invalid field mappings for ${dataStreamId}: ${validationResult.errors.join(', ')}`
      );
    }
  }

  private async resetApprovedStatus(integrationId: string): Promise<void> {
    assert(this.savedObjectService, 'Saved Objects service not initialized.');
    const integration = await this.savedObjectService.getIntegration(integrationId);
    if (integration.status === TASK_STATUSES.approved) {
      const currentVersion = integration.metadata?.version || '0.1.0';
      const newVersion = bumpMinorVersion(currentVersion);
      const title = integration.metadata?.title ?? integrationId;
      const changelogEntry = this.createChangelogEntry(newVersion, title, integration.changelog);
      const updateData: IntegrationAttributes = {
        ...integration,
        status: TASK_STATUSES.completed,
        changelog: [changelogEntry, ...(integration.changelog ?? [])],
      };

      await this.savedObjectService.updateIntegration(updateData, newVersion);
      this.logger.debug(
        `Integration ${integrationId} status reset from approved to completed after data stream mutation`
      );
    }
  }

  private createChangelogEntry(
    version: string,
    title: string,
    existingChangelog?: ChangelogEntry[]
  ): ChangelogEntry {
    const isInitialRelease = !existingChangelog || existingChangelog.length === 0;
    return {
      version,
      changes: [
        {
          description: isInitialRelease ? `Initial release of ${title}` : `Updated ${title}`,
          type: 'enhancement',
          link: '',
        },
      ],
    };
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
