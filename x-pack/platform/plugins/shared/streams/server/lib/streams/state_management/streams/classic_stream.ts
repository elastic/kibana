/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesDataStream,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { isNotFoundError } from '@kbn/es-errors';
import type {
  FailureStore,
  IngestStreamLifecycle,
  IngestStreamSettings,
} from '@kbn/streams-schema';
import { isIlmLifecycle, isInheritLifecycle, Streams } from '@kbn/streams-schema';
import { isMappingProperties } from '@kbn/streams-schema/src/fields';
import {
  isDisabledLifecycleFailureStore,
  isInheritFailureStore,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import _, { cloneDeep } from 'lodash';
import type { DataStreamMappingsUpdateResponse } from '../../data_streams/manage_data_streams';
import { StatusError } from '../../errors/status_error';
import { validateClassicFields, validateSimulation } from '../../helpers/validate_fields';
import { validateBracketsInFieldNames } from '../../helpers/validate_stream';
import { generateClassicIngestPipelineBody } from '../../ingest_pipelines/generate_ingest_pipeline';
import { getProcessingPipelineName } from '../../ingest_pipelines/name';
import { getDataStreamSettings, getUnmanagedElasticsearchAssets } from '../../stream_crud';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type {
  StreamChanges,
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from '../types';
import { formatSettings, settingsUpdateRequiresRollover } from './helpers';
import { validateSettings, validateSettingsWithDryRun } from './validate_settings';

interface ClassicStreamChanges extends StreamChanges {
  processing: boolean;
  field_overrides: boolean;
  failure_store: boolean;
  lifecycle: boolean;
  settings: boolean;
}

export class ClassicStream extends StreamActiveRecord<Streams.ClassicStream.Definition> {
  protected _changes: ClassicStreamChanges = {
    processing: false,
    field_overrides: false,
    lifecycle: false,
    failure_store: false,
    settings: false,
  };

  private _effectiveSettings?: IngestStreamSettings;

  constructor(definition: Streams.ClassicStream.Definition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  protected doClone(): StreamActiveRecord<Streams.ClassicStream.Definition> {
    return new ClassicStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    if (!Streams.ClassicStream.Definition.is(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    const startingStateStreamDefinition = startingState.get(this._definition.name)?.definition;

    if (
      startingStateStreamDefinition &&
      !Streams.ClassicStream.Definition.is(startingStateStreamDefinition)
    ) {
      throw new StatusError('Unexpected starting state stream type', 400);
    }

    this._changes.processing =
      !startingStateStreamDefinition ||
      !_.isEqual(
        _.omit(this._definition.ingest.processing, ['updated_at']),
        _.omit(startingStateStreamDefinition.ingest.processing, ['updated_at'])
      );

    this._changes.lifecycle =
      !startingStateStreamDefinition ||
      !_.isEqual(this._definition.ingest.lifecycle, startingStateStreamDefinition.ingest.lifecycle);

    this._changes.settings =
      !startingStateStreamDefinition ||
      !_.isEqual(await this.getEffectiveSettings(), this._definition.ingest.settings);

    this._changes.field_overrides =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.classic.field_overrides,
        startingStateStreamDefinition.ingest.classic.field_overrides
      );

    this._changes.failure_store =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.failure_store,
        startingStateStreamDefinition.ingest.failure_store
      );

    // The newly upserted definition will always have a new updated_at timestamp. But, if processing didn't change,
    // we should keep the existing updated_at as processing wasn't touched.
    if (startingStateStreamDefinition && !this._changes.processing) {
      this._definition.ingest.processing.updated_at =
        startingStateStreamDefinition.ingest.processing.updated_at;
    }

    return { cascadingChanges: [], changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    return { cascadingChanges: [], changeStatus: 'deleted' };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    if (this.dependencies.isServerless) {
      if (isIlmLifecycle(this.getLifecycle())) {
        return { isValid: false, errors: [new Error('Using ILM is not supported in Serverless')] };
      }

      if (isDisabledLifecycleFailureStore(this.getFailureStore())) {
        return {
          isValid: false,
          errors: [new Error('Disabling failure store lifecycle is not supported in Serverless')],
        };
      }
    }

    // Check for conflicts
    if (this._changes.lifecycle || this._changes.processing) {
      try {
        const dataStreamResult =
          await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
            name: this._definition.name,
          });

        if (dataStreamResult.data_streams.length === 0) {
          // There is an index but no data stream
          return {
            isValid: false,
            errors: [
              new Error(
                `Cannot create Classic stream ${this.definition.name} due to existing index`
              ),
            ],
          };
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          return {
            isValid: false,
            errors: [
              new Error(
                `Cannot create Classic stream ${this.definition.name} due to missing backing Data Stream`
              ),
            ],
          };
        }
        throw error;
      }
    }

    if (this._changes.field_overrides) {
      const response = (await this.dependencies.scopedClusterClient.asCurrentUser.transport.request(
        {
          method: 'PUT',
          path: `/_data_stream/${this._definition.name}/_mappings?dry_run=true`,
          body: {
            properties: this._definition.ingest.classic.field_overrides,
            _meta: {
              managed_by: 'streams',
            },
          },
        }
      )) as DataStreamMappingsUpdateResponse;
      if (response.data_streams.length === 0) {
        return {
          isValid: false,
          errors: [
            new Error(
              `Cannot create Classic stream ${this.definition.name} due to existing Data Stream mappings`
            ),
          ],
        };
      }
      if (response.data_streams[0].error) {
        return {
          isValid: false,
          errors: [
            new Error(
              `Cannot create Classic stream ${this.definition.name} due to error in Data Stream mappings: ${response.data_streams[0].error}`
            ),
          ],
        };
      }
    }

    validateClassicFields(this._definition);
    validateBracketsInFieldNames(this._definition);

    const allowlistValidation = validateSettings({
      settings: this._definition.ingest.settings,
      isServerless: this.dependencies.isServerless,
    });

    if (!allowlistValidation.isValid) {
      return allowlistValidation;
    }

    await Promise.all([
      validateSettingsWithDryRun({
        scopedClusterClient: this.dependencies.scopedClusterClient,
        streamName: this._definition.name,
        settings: this._definition.ingest.settings,
        isServerless: this.dependencies.isServerless,
      }),
      validateSimulation(this._definition, this.dependencies.scopedClusterClient),
    ]);

    return { isValid: true, errors: [] };
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    return { isValid: true, errors: [] };
  }

  // The actions append_processor_to_ingest_pipeline and delete_processor_from_ingest_pipeline are unique to ClassicStreams
  // Because there is no guarantee that there is a dedicated index template and ingest pipeline for ClassicStreams
  // These actions are merged across ClassicStream instances as part of ExecutionPlan.plan()
  // This is to enable us to clean up any pipeline Streams creates when it is no longer needed
  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._definition.ingest.processing.steps.length > 0) {
      actions.push(...(await this.createUpsertPipelineActions()));
    }
    if (!isInheritLifecycle(this.getLifecycle())) {
      actions.push({
        type: 'update_lifecycle',
        request: {
          name: this._definition.name,
          lifecycle: this.getLifecycle(),
        },
      });
    }

    actions.push({
      type: 'update_ingest_settings',
      request: {
        name: this._definition.name,
        settings: formatSettings(this._definition.ingest.settings, this.dependencies.isServerless),
      },
    });
    if (
      settingsUpdateRequiresRollover(
        await this.getEffectiveSettings(),
        this._definition.ingest.settings
      )
    ) {
      actions.push({
        type: 'rollover',
        request: { name: this._definition.name },
      });
    }

    if (!isInheritFailureStore(this._definition.ingest.failure_store)) {
      actions.push({
        type: 'update_failure_store',
        request: {
          name: this._definition.name,
          failure_store: this._definition.ingest.failure_store,
          definition: this._definition,
        },
      });
    }

    if (
      this._definition.ingest.classic.field_overrides &&
      isMappingProperties(this._definition.ingest.classic.field_overrides)
    ) {
      actions.push({
        type: 'update_data_stream_mappings',
        request: {
          name: this._definition.name,
          mappings: this._definition.ingest.classic.field_overrides,
        },
      });
    }

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._definition,
    });
    return actions;
  }

  public hasChangedLifecycle(): boolean {
    return this._changes.lifecycle;
  }

  public getLifecycle(): IngestStreamLifecycle {
    return this._definition.ingest.lifecycle;
  }

  public getFailureStore(): FailureStore {
    return this._definition.ingest.failure_store;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: ClassicStream
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._changes.processing && this._definition.ingest.processing.steps.length > 0) {
      actions.push(...(await this.createUpsertPipelineActions()));
    }

    if (this._changes.processing && this._definition.ingest.processing.steps.length === 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this._definition.name);
      actions.push({
        type: 'delete_ingest_pipeline',
        request: {
          name: streamManagedPipelineName,
        },
      });

      // Only generate delete action if a pipeline actually exists
      // Don't use fallback names for deletion - can't delete from non-existent pipelines
      const pipelineTargets = await this.getPipelineTargets({ useFallbackName: false });
      if (pipelineTargets) {
        const { pipeline, template } = pipelineTargets;
        actions.push({
          type: 'delete_processor_from_ingest_pipeline',
          pipeline,
          template,
          dataStream: this._definition.name,
          referencePipeline: streamManagedPipelineName,
        });
      }
    }

    if (this._changes.lifecycle) {
      actions.push({
        type: 'update_lifecycle',
        request: {
          name: this._definition.name,
          lifecycle: this.getLifecycle(),
        },
      });
    }

    if (this._changes.failure_store) {
      actions.push({
        type: 'update_failure_store',
        request: {
          name: this._definition.name,
          failure_store: this._definition.ingest.failure_store,
          definition: this._definition,
        },
      });
    }

    if (this._changes.settings) {
      actions.push({
        type: 'update_ingest_settings',
        request: {
          name: this._definition.name,
          settings: formatSettings(
            this._definition.ingest.settings,
            this.dependencies.isServerless
          ),
        },
      });

      if (
        settingsUpdateRequiresRollover(
          await this.getEffectiveSettings(),
          this._definition.ingest.settings
        )
      ) {
        actions.push({
          type: 'rollover',
          request: { name: this._definition.name },
        });
      }
    }

    if (this._changes.field_overrides) {
      const mappings = this._definition.ingest.classic.field_overrides || {};
      if (!isMappingProperties(mappings)) {
        throw new Error('Field overrides must be a valid mapping properties object');
      }
      actions.push({
        type: 'update_data_stream_mappings',
        request: {
          name: this._definition.name,
          mappings,
        },
      });
    }

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._definition,
    });

    return actions;
  }

  private async createUpsertPipelineActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];

    actions.push({
      type: 'upsert_ingest_pipeline',
      stream: this._definition.name,
      request: {
        id: getProcessingPipelineName(this._definition.name),
        ...generateClassicIngestPipelineBody(this._definition),
      },
    });

    const streamManagedPipelineName = getProcessingPipelineName(this._definition.name);
    const callStreamManagedPipelineProcessor: IngestProcessorContainer = {
      pipeline: {
        name: streamManagedPipelineName,
        if: `ctx._index == '${this._definition.name}'`,
        ignore_missing_pipeline: true,
        description:
          "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
      },
    };

    const pipelineTargets = await this.getPipelineTargets({ useFallbackName: true });
    if (!pipelineTargets) {
      throw new StatusError('Could not find pipeline targets', 500);
    }
    const { pipeline, template } = pipelineTargets;
    actions.push({
      type: 'append_processor_to_ingest_pipeline',
      pipeline,
      template,
      dataStream: this._definition.name,
      processor: callStreamManagedPipelineProcessor,
      referencePipeline: streamManagedPipelineName,
    });

    return actions;
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [
      {
        type: 'delete_datastream',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'delete_queries',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_assets',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_systems',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_features',
        request: {
          name: this._definition.name,
        },
      },
    ];

    if (this._definition.ingest.processing.steps.length > 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this._definition.name);
      actions.push({
        type: 'delete_ingest_pipeline',
        request: {
          name: streamManagedPipelineName,
        },
      });
      // Only generate delete action if a pipeline actually exists
      // Don't use fallback names for deletion - can't delete from non-existent pipelines
      const pipelineTargets = await this.getPipelineTargets({ useFallbackName: false });
      if (pipelineTargets) {
        const { pipeline, template } = pipelineTargets;
        actions.push({
          type: 'delete_processor_from_ingest_pipeline',
          pipeline,
          template,
          dataStream: this._definition.name,
          referencePipeline: streamManagedPipelineName,
        });
      }
    }

    return actions;
  }

  private async getPipelineTargets({ useFallbackName }: { useFallbackName: boolean }) {
    let dataStream: IndicesDataStream;
    try {
      dataStream = await this.dependencies.streamsClient.getDataStream(this._definition.name);
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
    const unmanagedAssets = await getUnmanagedElasticsearchAssets({
      dataStream,
      scopedClusterClient: this.dependencies.scopedClusterClient,
    });

    // For deletion operations, only return if there's an actual pipeline configured
    // Don't invent pipeline names - can't delete from non-existent pipelines
    if (!unmanagedAssets.ingestPipeline) {
      if (!useFallbackName) {
        return undefined;
      }
      // For append/create operations, use a fallback name if needed
      return {
        pipeline: `${dataStream.template}-pipeline`,
        template: dataStream.template,
      };
    }

    return {
      pipeline: unmanagedAssets.ingestPipeline,
      template: dataStream.template,
    };
  }

  private async getEffectiveSettings() {
    if (!this._effectiveSettings) {
      this._effectiveSettings = getDataStreamSettings(
        await this.dependencies.scopedClusterClient.asCurrentUser.indices
          .getDataStreamSettings({ name: this._definition.name })
          .then((res) => res.data_streams[0])
      );
    }
    return this._effectiveSettings;
  }
}
