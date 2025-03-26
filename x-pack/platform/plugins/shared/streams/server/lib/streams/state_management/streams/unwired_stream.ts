/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  IngestStreamLifecycle,
  StreamDefinition,
  UnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { isDslLifecycle, isInheritLifecycle, isUnwiredStreamDefinition } from '@kbn/streams-schema';
import _, { cloneDeep } from 'lodash';
import { StatusError } from '../../errors/status_error';
import { generateClassicIngestPipelineBody } from '../../ingest_pipelines/generate_ingest_pipeline';
import { getProcessingPipelineName } from '../../ingest_pipelines/name';
import { getUnmanagedElasticsearchAssets } from '../../stream_crud';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies, StreamChange } from '../types';
import type { StreamChangeStatus, ValidationResult } from './stream_active_record';
import { StreamActiveRecord } from './stream_active_record';

export class UnwiredStream extends StreamActiveRecord<UnwiredStreamDefinition> {
  constructor(definition: UnwiredStreamDefinition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  clone(): StreamActiveRecord<UnwiredStreamDefinition> {
    return new UnwiredStream(cloneDeep(this.definition), this.dependencies);
  }

  private _processingChanged: boolean = false;
  private _lifeCycleChanged: boolean = false;

  protected async doHandleUpsertChange(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this.definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    if (!isUnwiredStreamDefinition(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    const startingStateStreamDefinition = startingState.get(this.definition.name)?.definition;

    if (
      startingStateStreamDefinition &&
      !isUnwiredStreamDefinition(startingStateStreamDefinition)
    ) {
      throw new StatusError('Unexpected starting state stream type', 400);
    }

    this._processingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this.definition.ingest.processing,
        startingStateStreamDefinition.ingest.processing
      );

    this._lifeCycleChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(this.definition.ingest.lifecycle, startingStateStreamDefinition.ingest.lifecycle);

    return { cascadingChanges: [], changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target !== this.definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    return { cascadingChanges: [], changeStatus: 'deleted' };
  }

  protected async doValidate(desiredState: State, startingState: State): Promise<ValidationResult> {
    if (this._lifeCycleChanged && isDslLifecycle(this.getLifeCycle())) {
      const dataStream = await this.dependencies.streamsClient.getDataStream(this.definition.name);
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

  // The actions append_processor_to_ingest_pipeline and delete_processor_from_ingest_pipeline are unique to UnwiredStreams
  // Because there is no guarantee that there is a dedicated index template and ingest pipeline for UnwiredStreams
  // These actions are merged across UnwiredStream instances as part of ExecutionPlan.plan()
  // This is to enable us to clean up any pipeline Streams creates when it is no longer needed
  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this.definition.ingest.processing.length > 0) {
      actions.push(...(await this.createUpsertPipelineActions()));
    }
    if (!isInheritLifecycle(this.getLifeCycle())) {
      actions.push({
        type: 'update_lifecycle',
        request: {
          name: this.definition.name,
          lifecycle: this.getLifeCycle(),
        },
      });
    }
    actions.push({
      type: 'upsert_dot_streams_document',
      request: this.definition,
    });
    return actions;
  }

  public hasChangedLifeCycle(): boolean {
    return this._lifeCycleChanged;
  }

  public getLifeCycle(): IngestStreamLifecycle {
    return this.definition.ingest.lifecycle;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: UnwiredStream
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._processingChanged && this.definition.ingest.processing.length > 0) {
      actions.push(...(await this.createUpsertPipelineActions()));
    }

    if (this._processingChanged && this.definition.ingest.processing.length === 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this.definition.name);
      actions.push({
        type: 'delete_ingest_pipeline',
        request: {
          name: streamManagedPipelineName,
        },
      });

      const { pipeline, template } = await this.getPipelineTargets();
      actions.push({
        type: 'delete_processor_from_ingest_pipeline',
        pipeline,
        template,
        dataStream: this.definition.name,
        referencePipeline: streamManagedPipelineName,
      });
    }

    if (this._lifeCycleChanged) {
      actions.push({
        type: 'update_lifecycle',
        request: {
          name: this.definition.name,
          lifecycle: this.getLifeCycle(),
        },
      });
    }

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this.definition,
    });

    return actions;
  }

  private async createUpsertPipelineActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];

    actions.push({
      type: 'upsert_ingest_pipeline',
      stream: this.definition.name,
      request: {
        id: getProcessingPipelineName(this.definition.name),
        ...generateClassicIngestPipelineBody(this.definition),
      },
    });

    const streamManagedPipelineName = getProcessingPipelineName(this.definition.name);
    const callStreamManagedPipelineProcessor: IngestProcessorContainer = {
      pipeline: {
        name: streamManagedPipelineName,
        if: `ctx._index == '${this.definition.name}'`,
        ignore_missing_pipeline: true,
        description:
          "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
      },
    };

    const { pipeline, template } = await this.getPipelineTargets();
    actions.push({
      type: 'append_processor_to_ingest_pipeline',
      pipeline,
      template,
      dataStream: this.definition.name,
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
          name: this.definition.name,
        },
      },
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this.definition.name,
        },
      },
    ];

    if (this.definition.ingest.processing.length > 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this.definition.name);
      actions.push({
        type: 'delete_ingest_pipeline',
        request: {
          name: streamManagedPipelineName,
        },
      });
      const { pipeline, template } = await this.getPipelineTargets();
      actions.push({
        type: 'delete_processor_from_ingest_pipeline',
        pipeline,
        template,
        dataStream: this.definition.name,
        referencePipeline: streamManagedPipelineName,
      });
    }

    return actions;
  }

  private async getPipelineTargets() {
    const dataStream = await this.dependencies.streamsClient.getDataStream(this.definition.name);
    const unmanagedAssets = await getUnmanagedElasticsearchAssets({
      dataStream,
      scopedClusterClient: this.dependencies.scopedClusterClient,
    });
    const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;

    return {
      pipeline: pipelineName ? pipelineName : `${dataStream.template}-pipeline`,
      template: dataStream.template,
    };
  }
}
