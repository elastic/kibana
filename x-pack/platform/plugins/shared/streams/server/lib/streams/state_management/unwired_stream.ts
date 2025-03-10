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
import {
  IndicesDataStream,
  IndicesPutIndexTemplateRequest,
  IngestPipeline,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { DiagnosticResult, errors } from '@elastic/elasticsearch';
import { cloneDeep } from 'lodash';
import { isResponseError } from '@kbn/es-errors';
import _ from 'lodash';
import { set } from '@kbn/safer-lodash-set';
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

  protected async doDelete(desiredState: State, startingState: State): Promise<StreamChange[]> {
    return this.definition.ingest.routing.map((routing) => ({
      target: routing.destination,
      type: 'delete',
    }));
  }

  protected async doValidate(desiredState: State, startingState: State): Promise<ValidationResult> {
    // What do we need to validate here?
    return { isValid: true, errors: [] };
  }

  // TODO - probably shouldn't be here, not sure where to put it... should the active
  // record have a reference to the client again? This could lead to weird behavior OTOH...
  // maybe a `Pick`ed version? Or maybe it should go into stream_crud instead?
  private async getDataStream(name: string): Promise<IndicesDataStream> {
    return this.dependencies.scopedClusterClient.asCurrentUser.indices
      .getDataStream({ name })
      .then((response) => {
        if (response.data_streams.length === 0) {
          throw new errors.ResponseError({
            meta: {
              aborted: false,
              attempts: 1,
              connection: null,
              context: null,
              name: 'resource_not_found_exception',
              request: {} as unknown as DiagnosticResult['meta']['request'],
            },
            warnings: [],
            body: 'resource_not_found_exception',
            statusCode: 404,
          });
        }

        const dataStream = response.data_streams[0];
        return dataStream;
      });
  }

  private async findStreamManagedPipelineReference(
    pipelineName: string,
    streamId: string
  ): Promise<{
    targetPipelineName: string;
    targetPipeline: IngestPipeline;
    referencesStreamManagedPipeline: boolean;
  }> {
    const streamManagedPipelineName = getProcessingPipelineName(streamId);
    const pipeline = (await this.tryGettingPipeline(pipelineName)) || {
      processors: [],
    };
    const streamProcessor = pipeline.processors?.find(
      (processor) => processor.pipeline && processor.pipeline.name === streamManagedPipelineName
    );
    const customProcessor = pipeline.processors?.findLast(
      (processor) => processor.pipeline && processor.pipeline.name.endsWith('@custom')
    );
    if (streamProcessor) {
      return {
        targetPipelineName: pipelineName,
        targetPipeline: pipeline,
        referencesStreamManagedPipeline: true,
      };
    }
    if (customProcessor) {
      // go one level deeper, find the latest @custom leaf pipeline
      return await this.findStreamManagedPipelineReference(
        customProcessor.pipeline!.name,
        streamId
      );
    }
    return {
      targetPipelineName: pipelineName,
      targetPipeline: pipeline,
      referencesStreamManagedPipeline: false,
    };
  }

  private async tryGettingPipeline(id: string) {
    return this.dependencies.scopedClusterClient.asCurrentUser.ingest
      .getPipeline({ id })
      .then((response) => response[id])
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return undefined;
        }
        throw error;
      });
  }

  private async ensureStreamManagedPipelineReference(): Promise<ElasticsearchAction[]> {
    const executionPlan: ElasticsearchAction[] = [];
    const dataStream = await this.getDataStream(this._updated_definition.name);
    const unmanagedAssets = await getUnmanagedElasticsearchAssets({
      dataStream,
      scopedClusterClient: this.dependencies.scopedClusterClient,
    });
    const streamManagedPipelineName = getProcessingPipelineName(this._updated_definition.name);
    const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;
    if (pipelineName === streamManagedPipelineName) {
      // the data stream is already calling the stream managed pipeline directly
      return [];
    }
    if (!pipelineName) {
      // no ingest pipeline, we need to update the template to call the stream managed pipeline as
      // the default pipeline
      const indexTemplateAsset = unmanagedAssets.find((asset) => asset.type === 'index_template');
      if (!indexTemplateAsset) {
        throw new Error(`Could not find index template for stream ${this.definition.name}`);
      }
      const indexTemplate = (
        await this.dependencies.scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
          name: indexTemplateAsset.id,
        })
      ).index_templates[0].index_template;
      const updatedTemplate: IndicesPutIndexTemplateRequest = {
        name: indexTemplateAsset.id,
        template: {
          ...indexTemplate.template,
          settings: {
            ...indexTemplate.template?.settings,
            index: {
              ...indexTemplate.template?.settings?.index,
              default_pipeline: streamManagedPipelineName,
            },
          },
        },
      };
      executionPlan.push({
        type: 'upsert_index_template',
        request: updatedTemplate,
      });

      // rollover the data stream to apply the new default pipeline
      // TODO
      executionPlan.push({
        type: 'upsert_write_index_or_rollover',
        request: {
          name: this._updated_definition.name,
        },
      });
      return executionPlan;
    }
    const { targetPipelineName, targetPipeline, referencesStreamManagedPipeline } =
      await this.findStreamManagedPipelineReference(pipelineName, this.definition.name);
    if (!referencesStreamManagedPipeline) {
      const callStreamManagedPipelineProcessor: IngestProcessorContainer = {
        pipeline: {
          name: streamManagedPipelineName,
          if: `ctx._index == '${this.definition.name}'`,
          ignore_missing_pipeline: true,
          description:
            "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
        },
      };
      executionPlan.push({
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: set(
          { ...targetPipeline, id: targetPipelineName },
          'processors',
          (targetPipeline.processors || []).concat(callStreamManagedPipelineProcessor)
        ),
      });
    }
    return executionPlan;
  }

  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this._updated_definition.ingest.processing.length > 0) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateIngestPipeline(this._updated_definition.name, this._updated_definition),
      });
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
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateIngestPipeline(this._updated_definition.name, this._updated_definition),
      });
      actions.push(...(await this.ensureStreamManagedPipelineReference()));
    }
    if (this._processingChanged && this._updated_definition.ingest.processing.length === 0) {
      // to simplify and because it doesn't hurt anything, we leave the
      // pipeline reference in place even if we delete the pipeline itself.
      // we could clean this up, this can be done in a follow-up
      actions.push({
        type: 'delete_ingest_pipeline',
        request: {
          name: getProcessingPipelineName(this._updated_definition.name),
        },
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

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'delete_ingest_pipeline',
        request: {
          name: getProcessingPipelineName(this.definition.name),
        },
      },
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
  }
}
