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
import type {
  IngestStreamLifecycle,
  StreamDefinition,
  UnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { isDslLifecycle, isInheritLifecycle, isUnwiredStreamDefinition } from '@kbn/streams-schema';
import _, { cloneDeep } from 'lodash';
import { isNotFoundError } from '@kbn/es-errors';
import { StatusError } from '../../errors/status_error';
import { generateClassicIngestPipelineBody } from '../../ingest_pipelines/generate_ingest_pipeline';
import { getProcessingPipelineName } from '../../ingest_pipelines/name';
import { getUnmanagedElasticsearchAssets } from '../../stream_crud';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies, StreamChange } from '../types';
import type {
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord, PrintableStream } from '../stream_active_record/stream_active_record';

export class UnwiredStream extends StreamActiveRecord<UnwiredStreamDefinition> {
  private _processingChanged: boolean = false;
  private _lifeCycleChanged: boolean = false;

  constructor(definition: UnwiredStreamDefinition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  clone(): StreamActiveRecord<UnwiredStreamDefinition> {
    return new UnwiredStream(cloneDeep(this._definition), this.dependencies);
  }

  toPrintable(): PrintableStream {
    return {
      ...super.toPrintable(),
      processingChanged: this._processingChanged,
      lifeCycleChanged: this._lifeCycleChanged,
    };
  }

  protected async doHandleUpsertChange(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    if (!isUnwiredStreamDefinition(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    const startingStateStreamDefinition = startingState.get(this._definition.name)?.definition;

    if (
      startingStateStreamDefinition &&
      !isUnwiredStreamDefinition(startingStateStreamDefinition)
    ) {
      throw new StatusError('Unexpected starting state stream type', 400);
    }

    this._processingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.processing,
        startingStateStreamDefinition.ingest.processing
      );

    this._lifeCycleChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(this._definition.ingest.lifecycle, startingStateStreamDefinition.ingest.lifecycle);

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
    // Check for conflicts
    if (this._lifeCycleChanged || this._processingChanged) {
      try {
        const dataStreamResult =
          await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
            name: this._definition.name,
          });

        if (dataStreamResult.data_streams.length === 0) {
          // There is an index but no data stream
          return {
            isValid: false,
            errors: [`Cannot create Unwired stream ${this.definition.name} due to existing index`],
          };
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          return {
            isValid: false,
            errors: [
              `Cannot create Unwired stream ${this.definition.name} due to missing backing Data Stream`,
            ],
          };
        }
        throw error;
      }
    }

    if (this._lifeCycleChanged && isDslLifecycle(this.getLifeCycle())) {
      const dataStream = await this.dependencies.streamsClient.getDataStream(this._definition.name);
      if (dataStream.ilm_policy !== undefined) {
        return {
          isValid: false,
          errors: [
            'Cannot apply DSL lifecycle to a data stream that is already managed by an ILM policy',
          ],
        };
      }
    }
    return { isValid: true, errors: [] };
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    return { isValid: true, errors: [] };
  }

  // The actions append_processor_to_ingest_pipeline and delete_processor_from_ingest_pipeline are unique to UnwiredStreams
  // Because there is no guarantee that there is a dedicated index template and ingest pipeline for UnwiredStreams
  // These actions are merged across UnwiredStream instances as part of ExecutionPlan.plan()
  // This is to enable us to clean up any pipeline Streams creates when it is no longer needed
  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._definition.ingest.processing.length > 0) {
      actions.push(...(await this.createUpsertPipelineActions()));
    }
    if (!isInheritLifecycle(this.getLifeCycle())) {
      actions.push({
        type: 'update_lifecycle',
        request: {
          name: this._definition.name,
          lifecycle: this.getLifeCycle(),
        },
      });
    }
    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._definition,
    });
    return actions;
  }

  public hasChangedLifeCycle(): boolean {
    return this._lifeCycleChanged;
  }

  public getLifeCycle(): IngestStreamLifecycle {
    return this._definition.ingest.lifecycle;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: UnwiredStream
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._processingChanged && this._definition.ingest.processing.length > 0) {
      actions.push(...(await this.createUpsertPipelineActions()));
    }

    if (this._processingChanged && this._definition.ingest.processing.length === 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this._definition.name);
      actions.push({
        type: 'delete_ingest_pipeline',
        request: {
          name: streamManagedPipelineName,
        },
      });

      const pipelineTargets = await this.getPipelineTargets();
      if (!pipelineTargets) {
        throw new StatusError('Could not find pipeline targets', 500);
      }
      const { pipeline, template } = pipelineTargets;
      actions.push({
        type: 'delete_processor_from_ingest_pipeline',
        pipeline,
        template,
        dataStream: this._definition.name,
        referencePipeline: streamManagedPipelineName,
      });
    }

    if (this._lifeCycleChanged) {
      actions.push({
        type: 'update_lifecycle',
        request: {
          name: this._definition.name,
          lifecycle: this.getLifeCycle(),
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

    const pipelineTargets = await this.getPipelineTargets();
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
    ];

    if (this._definition.ingest.processing.length > 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this._definition.name);
      actions.push({
        type: 'delete_ingest_pipeline',
        request: {
          name: streamManagedPipelineName,
        },
      });
      const pipelineTargets = await this.getPipelineTargets();
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

  private async getPipelineTargets() {
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

    return {
      pipeline: unmanagedAssets.ingestPipeline ?? `${dataStream.template}-pipeline`,
      template: dataStream.template,
    };
  }
}
