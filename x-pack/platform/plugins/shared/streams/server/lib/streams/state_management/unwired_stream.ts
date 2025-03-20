/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestStreamLifecycle,
  StreamDefinition,
  UnwiredStreamDefinition,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { cloneDeep } from 'lodash';
import _ from 'lodash';
import { State, StreamChange } from './state';
import { StreamActiveRecord, ValidationResult, StreamDependencies } from './stream_active_record';
import { ElasticsearchAction } from './execution_plan';
import { generateIngestPipeline } from '../ingest_pipelines/generate_ingest_pipeline';
import { getProcessingPipelineName } from '../ingest_pipelines/name';
import { getUnmanagedElasticsearchAssets } from '../stream_crud';

export class UnwiredStream extends StreamActiveRecord<UnwiredStreamDefinition> {
  constructor(definition: UnwiredStreamDefinition, dependencies: StreamDependencies) {
    super(definition, dependencies);
    // What about the assets?
  }

  clone(): StreamActiveRecord<UnwiredStreamDefinition> {
    return new UnwiredStream(cloneDeep(this._updated_definition), this.dependencies);
  }

  private _processingChanged: boolean = false;
  private _lifeCycleChanged: boolean = false;

  protected async doUpsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (definition.name !== this.definition.name) {
      return [];
    }
    if (!isUnwiredStreamDefinition(definition)) {
      throw new Error('Cannot change stream types');
    }

    this._updated_definition = definition;

    const startingStateStreamDefinition = startingState.get(this.definition.name)?.definition;

    if (
      startingStateStreamDefinition &&
      !isUnwiredStreamDefinition(startingStateStreamDefinition)
    ) {
      throw new Error('Unexpected starting state stream type');
    }

    this._processingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._updated_definition.ingest.processing,
        startingStateStreamDefinition.ingest.processing
      );

    this._lifeCycleChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._updated_definition.ingest.lifecycle,
        startingStateStreamDefinition.ingest.lifecycle
      );

    return [];
  }

  protected async doDelete(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (target !== this.definition.name) {
      return [];
    }
    this.changeStatus = 'deleted';
    return [];
  }

  protected async doValidate(desiredState: State, startingState: State): Promise<ValidationResult> {
    // What do we need to validate here?
    return { isValid: true, errors: [] };
  }

  // The actions append_processor_to_ingest_pipeline and delete_processor_from_ingest_pipeline are unique to UnwiredStreams
  // Because there is no guarantee that there is a dedicated index template and ingest pipeline for UnwiredStreams
  // These actions are merged across UnwiredStream instances as part of ExecutionPlan.plan()
  // This is to enable us to clean up any pipeline Streams creates when it is no longer needed
  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._updated_definition.ingest.processing.length > 0) {
      actions.push(...(await this.createAppendPipelineActions()));
    }
    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._updated_definition,
    });
    return actions;
  }

  public hasChangedLifeCycle(): boolean {
    return this._lifeCycleChanged;
  }

  public getLifeCycle(): IngestStreamLifecycle {
    return this._updated_definition.ingest.lifecycle;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: UnwiredStream
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._processingChanged && this._updated_definition.ingest.processing.length > 0) {
      actions.push(...(await this.createAppendPipelineActions()));
    }

    if (this._processingChanged && this._updated_definition.ingest.processing.length === 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this._updated_definition.name);
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
        dataStream: this._updated_definition.name,
        referencePipeline: streamManagedPipelineName,
      });
    }

    // TODO take care of lifecycle
    if (this._lifeCycleChanged) {
      actions.push({
        type: 'update_lifecycle',
        request: {
          name: this._updated_definition.name,
          lifecycle: this._updated_definition.ingest.lifecycle,
        },
      });
    }

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._updated_definition,
    });

    // TODO get assets into this

    return actions;
  }

  private async createAppendPipelineActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];

    actions.push({
      type: 'upsert_ingest_pipeline',
      stream: this.definition.name,
      request: generateIngestPipeline(this._updated_definition.name, this._updated_definition),
    });

    const streamManagedPipelineName = getProcessingPipelineName(this._updated_definition.name);
    const callStreamManagedPipelineProcessor: IngestProcessorContainer = {
      pipeline: {
        name: streamManagedPipelineName,
        if: `ctx._index == '${this._updated_definition.name}'`,
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
      dataStream: this._updated_definition.name,
      processor: callStreamManagedPipelineProcessor,
      referencePipeline: streamManagedPipelineName,
    });

    return actions;
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [
      // Should we really delete here? Maybe we just need a rollover instead?
      {
        type: 'delete_datastream',
        request: {
          name: this._updated_definition.name,
        },
      },
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this._updated_definition.name,
        },
      },
      {
        type: 'sync_asset_list',
        request: {
          name: this._updated_definition.name,
          assetIds: [],
        },
      },
    ];

    if (this._updated_definition.ingest.processing.length > 0) {
      const streamManagedPipelineName = getProcessingPipelineName(this._updated_definition.name);
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
        dataStream: this._updated_definition.name,
        referencePipeline: streamManagedPipelineName,
      });
    }

    return actions;
  }

  private async getPipelineTargets() {
    const dataStream = await this.dependencies.streamsClient.getDataStream(
      this._updated_definition.name
    );
    const unmanagedAssets = await getUnmanagedElasticsearchAssets({
      dataStream,
      scopedClusterClient: this.dependencies.scopedClusterClient,
    });
    const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;

    return {
      pipeline: pipelineName ? pipelineName : `${dataStream.template}@custom`,
      template: dataStream.template,
    };
  }
}
