/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from '@kbn/es-errors';
import { Streams, validateStreamName } from '@kbn/streams-schema';
import { isIlmLifecycle } from '@kbn/streams-schema';
import { isDisabledLifecycleFailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { conditionToPainless, isAlwaysCondition, transpileIngestPipeline } from '@kbn/streamlang';
import { cloneDeep } from 'lodash';
import { ASSET_VERSION } from '../../../../../common/constants';
import { generateLayer } from '../../component_templates/generate_layer';
import { isDefinitionNotFoundError } from '../../errors/definition_not_found_error';
import { generateIndexTemplate } from '../../index_templates/generate_index_template';
import { getIndexTemplateName } from '../../index_templates/name';
import { getProcessingPipelineName, getReroutePipelineName } from '../../ingest_pipelines/name';
import { createStreamlangResolverOptions } from '../../resolvers';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies, StreamChange } from '../types';
import type {
  StreamChangeStatus,
  StreamChanges,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import { computeChange, formatSettings, validateQueryStreams } from './helpers';
import { validateSettings, validateSettingsWithDryRun } from './validate_settings';

const GRAPH_STREAM_MAX_DEPTH = 10;

interface GraphStreamChanges extends StreamChanges {
  ownFields: boolean;
  routing: boolean;
  processing: boolean;
  failure_store: boolean;
  lifecycle: boolean;
  settings: boolean;
  query_streams: boolean;
}

export class GraphStream extends StreamActiveRecord<Streams.GraphStream.Definition> {
  protected _changes: GraphStreamChanges = {
    ownFields: false,
    routing: false,
    processing: false,
    lifecycle: false,
    failure_store: false,
    settings: false,
    query_streams: false,
  };

  constructor(definition: Streams.GraphStream.Definition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  protected doClone(): StreamActiveRecord<Streams.GraphStream.Definition> {
    return new GraphStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      // No ancestor cascade on the graph path — nodes are standalone
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    if (!Streams.GraphStream.Definition.is(definition)) {
      throw new Error('Cannot change stream types');
    }

    this._definition = definition;

    const startingStateStreamDefinition = startingState.get(this._definition.name)?.definition;
    if (
      startingStateStreamDefinition &&
      !Streams.GraphStream.Definition.is(startingStateStreamDefinition)
    ) {
      throw new Error('Unexpected starting state stream type');
    }

    const isExistingStream = !!startingStateStreamDefinition;

    this._changes.ownFields = computeChange({
      isExistingStream,
      hasMeaningfulValue: Object.keys(this._definition.ingest.graph.fields || {}).length > 0,
      hasChanged: () =>
        JSON.stringify(this._definition.ingest.graph.fields) !==
        JSON.stringify(startingStateStreamDefinition!.ingest.graph.fields),
    });

    this._changes.routing = computeChange({
      isExistingStream,
      hasMeaningfulValue: (this._definition.ingest.graph.routing || []).length > 0,
      hasChanged: () =>
        JSON.stringify(this._definition.ingest.graph.routing) !==
        JSON.stringify(startingStateStreamDefinition!.ingest.graph.routing),
    });

    this._changes.failure_store = computeChange({
      isExistingStream,
      hasMeaningfulValue: true,
      hasChanged: () =>
        JSON.stringify(this._definition.ingest.failure_store) !==
        JSON.stringify(startingStateStreamDefinition!.ingest.failure_store),
    });

    this._changes.processing = computeChange({
      isExistingStream,
      hasMeaningfulValue: (this._definition.ingest.processing.steps || []).length > 0,
      hasChanged: () =>
        JSON.stringify({
          ...this._definition.ingest.processing,
          updated_at: undefined,
        }) !==
        JSON.stringify({
          ...startingStateStreamDefinition!.ingest.processing,
          updated_at: undefined,
        }),
    });

    this._changes.lifecycle = computeChange({
      isExistingStream,
      hasMeaningfulValue: true,
      hasChanged: () =>
        JSON.stringify(this._definition.ingest.lifecycle) !==
        JSON.stringify(startingStateStreamDefinition!.ingest.lifecycle),
    });

    this._changes.settings = computeChange({
      isExistingStream,
      hasMeaningfulValue: Object.keys(this._definition.ingest.settings || {}).length > 0,
      hasChanged: () =>
        JSON.stringify(this._definition.ingest.settings) !==
        JSON.stringify(startingStateStreamDefinition!.ingest.settings),
    });

    this._changes.query_streams =
      !startingStateStreamDefinition ||
      JSON.stringify(this._definition.query_streams ?? []) !==
        JSON.stringify(startingStateStreamDefinition.query_streams ?? []);

    if (startingStateStreamDefinition && !this._changes.processing) {
      this._definition.ingest.processing.updated_at =
        startingStateStreamDefinition.ingest.processing.updated_at;
    }

    // No parent cascade — no name-derived parent exists on the graph path.
    // DO cascade to routing destinations: create minimal stubs for any destination
    // that doesn't yet exist in desired state, so a single-node upsert can wire
    // itself to new destinations without requiring a co-submitted batch.
    const cascadingChanges: StreamChange[] = [];
    if (this._changes.routing) {
      const now = new Date().toISOString();
      for (const route of this._definition.ingest.graph.routing) {
        if (!desiredState.has(route.destination)) {
          cascadingChanges.push({
            type: 'upsert',
            definition: {
              type: 'graph',
              name: route.destination,
              description: '',
              updated_at: now,
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [], updated_at: now },
                settings: {},
                graph: { fields: {}, routing: [] },
                failure_store: { inherit: {} },
              },
            },
          });
        }
      }
    }

    return { cascadingChanges, changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    const cascadingChanges: StreamChange[] = [];

    // Cascade delete to any child query streams attached to this node
    for (const childRef of this._definition.query_streams ?? []) {
      cascadingChanges.push({ type: 'delete', name: childRef.name });
    }

    // Do NOT cascade to routing destinations — they are independent nodes that
    // may be routed to from other sources in the graph.

    return { cascadingChanges, changeStatus: 'deleted' };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    // Basic name check — flat (no dots) enforced so composed_of stays standalone
    const nameValidation = validateStreamName(this._definition.name);
    if (!nameValidation.valid) {
      return { isValid: false, errors: [new Error(nameValidation.message)] };
    }
    if (this._definition.name.includes('.')) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Graph stream node id "${this._definition.name}" must not contain dots — use underscores instead`
          ),
        ],
      };
    }

    // Check for data stream conflicts on new streams
    const existsInStartingState = startingState.has(this._definition.name);
    if (!existsInStartingState) {
      const conflict = await this.checkDataStreamConflict();
      if (conflict) {
        return { isValid: false, errors: [conflict] };
      }
    }

    // DAG: detect cycles and enforce soft depth limit across the full graph of graph-stream nodes
    // (destinations not yet in desiredState are stubs that carry no outbound edges, so they can't
    // introduce cycles — they were auto-vivified by the cascade in doHandleUpsertChange)
    const cycleError = this.detectCycleOrDepthViolation(desiredState);
    if (cycleError) {
      return { isValid: false, errors: [cycleError] };
    }

    const queryStreamsValidation = validateQueryStreams({
      desiredState,
      name: this._definition.name,
      queryStreams: this._definition.query_streams ?? [],
    });
    if (queryStreamsValidation) {
      return queryStreamsValidation;
    }

    if (this.dependencies.isServerless) {
      if (isIlmLifecycle(this._definition.ingest.lifecycle)) {
        return { isValid: false, errors: [new Error('Using ILM is not supported in Serverless')] };
      }
      if (isDisabledLifecycleFailureStore(this._definition.ingest.failure_store)) {
        return {
          isValid: false,
          errors: [new Error('Disabling failure store lifecycle is not supported in Serverless')],
        };
      }
    }

    const allowlistValidation = validateSettings({
      settings: this._definition.ingest.settings,
      isServerless: this.dependencies.isServerless,
    });
    if (!allowlistValidation.isValid) {
      return allowlistValidation;
    }

    if (existsInStartingState && this._changes.settings) {
      await validateSettingsWithDryRun({
        esClient: this.dependencies.esClient,
        streamName: this._definition.name,
        settings: this._definition.ingest.settings,
        isServerless: this.dependencies.isServerless,
      });
    }

    return { isValid: true, errors: [] };
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    return { isValid: true, errors: [] };
  }

  protected async doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]> {
    const lifecycle = this._definition.ingest.lifecycle;
    const failureStore = this._definition.ingest.failure_store;
    const settings = formatSettings(
      this._definition.ingest.settings,
      this.dependencies.isServerless
    );

    const { existsAsManagedDataStream } = await this.checkDataStreamExists();

    // For graph-stream nodes, composed_of is always standalone (own @stream.layer only).
    // generateIndexTemplate already yields this for flat (non-dotted) names since
    // getAncestorsAndSelf returns [name] for single-segment names.
    const actions: ElasticsearchAction[] = [
      {
        type: 'upsert_component_template',
        request: generateLayer(this._definition.name, this._definition, this.dependencies.isServerless),
      },
      // Step 4: processing pipeline — guard-less, modeled on generateClassicIngestPipelineBody
      // + stream.name stamping + @stream.reroutes call.  Stubbed here; filled in Step 4.
      await this.generateProcessingPipelineAction(),
      // Step 4: reroute pipeline — generateReroutePipeline via type-generalizing adapter.
      this.generateReroutePipelineAction(),
      {
        type: 'upsert_index_template',
        request: generateIndexTemplate(
          this._definition.name,
          lifecycle,
          failureStore,
          this.dependencies.isServerless
        ),
      },
      {
        type: 'upsert_dot_streams_document',
        request: this._definition,
      },
      existsAsManagedDataStream
        ? { type: 'rollover' as const, request: { name: this._definition.name } }
        : { type: 'upsert_datastream' as const, request: { name: this._definition.name } },
      { type: 'update_lifecycle', request: { name: this._definition.name, lifecycle } },
      {
        type: 'update_ingest_settings',
        request: { name: this._definition.name, settings },
      },
      {
        type: 'update_failure_store',
        request: { name: this._definition.name, failure_store: failureStore, definition: this._definition },
      },
    ];

    return actions;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: StreamActiveRecord<Streams.GraphStream.Definition>
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];

    if (this._changes.ownFields) {
      actions.push({
        type: 'upsert_component_template',
        request: generateLayer(this._definition.name, this._definition, this.dependencies.isServerless),
      });
      actions.push({ type: 'rollover', request: { name: this._definition.name } });
    }

    if (this._changes.processing) {
      actions.push(await this.generateProcessingPipelineAction());
    }

    if (this._changes.routing) {
      actions.push(this.generateReroutePipelineAction());
    }

    if (this._changes.lifecycle) {
      actions.push({
        type: 'update_lifecycle',
        request: { name: this._definition.name, lifecycle: this._definition.ingest.lifecycle },
      });
    }

    if (this._changes.settings) {
      actions.push({
        type: 'update_ingest_settings',
        request: {
          name: this._definition.name,
          settings: formatSettings(this._definition.ingest.settings, this.dependencies.isServerless),
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

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._definition,
    });

    return actions;
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      { type: 'delete_ingest_pipeline', request: { name: getProcessingPipelineName(this._definition.name) } },
      { type: 'delete_ingest_pipeline', request: { name: getReroutePipelineName(this._definition.name) } },
      { type: 'delete_index_template', request: { name: getIndexTemplateName(this._definition.name) } },
      { type: 'delete_datastream', request: { name: this._definition.name } },
      { type: 'delete_dot_streams_document', request: { name: this._definition.name } },
      { type: 'unlink_assets', request: { name: this._definition.name } },
      { type: 'delete_queries', request: { definition: this._definition } },
    ];
  }

  // --- pipeline stubs (filled in Step 4) ---

  private async generateProcessingPipelineAction(): Promise<ElasticsearchAction> {
    // Modeled on generateClassicIngestPipelineBody — guard-less, transpiles Streamlang,
    // stamps stream.name, and calls the @stream.reroutes pipeline.
    const transpiledPipeline = await transpileIngestPipeline(
      this._definition.ingest.processing,
      undefined,
      createStreamlangResolverOptions(this.dependencies.esClient)
    );

    return {
      type: 'upsert_ingest_pipeline',
      stream: this._definition.name,
      request: {
        id: getProcessingPipelineName(this._definition.name),
        processors: [
          {
            script: {
              source: 'ctx["stream.name"] = params.field',
              lang: 'painless',
              params: { field: this._definition.name },
            },
          },
          ...transpiledPipeline.processors,
          {
            pipeline: {
              name: `${this._definition.name}@stream.reroutes`,
              ignore_missing_pipeline: true,
            },
          },
        ],
        field_access_pattern: 'flexible',
        _meta: {
          description: `Default pipeline for the ${this._definition.name} stream`,
          managed: true,
        },
        version: ASSET_VERSION,
      },
    };
  }

  private generateReroutePipelineAction(): ElasticsearchAction {
    // Type-generalizing adapter for generateReroutePipeline.
    // GraphStream routing mirrors wired {destination, where, status}, so conditionToPainless reuses directly.
    return {
      type: 'upsert_ingest_pipeline',
      stream: this._definition.name,
      request: {
        id: getReroutePipelineName(this._definition.name),
        processors: this._definition.ingest.graph.routing
          .filter((route) => route.status !== 'disabled')
          .map((route) => {
            // Omit the `if` field for always conditions — generates a clean unconditional reroute
            // that ES evaluates as "always route", consistent with first-match-wins semantics.
            const ifClause = isAlwaysCondition(route.where)
              ? {}
              : { if: conditionToPainless(route.where) };
            return {
              reroute: {
                destination: route.destination,
                ...ifClause,
              },
            };
          }),
        _meta: {
          description: `Reroute pipeline for the ${this._definition.name} stream`,
          managed: true,
        },
        version: ASSET_VERSION,
      },
    };
  }

  // --- helpers ---

  private async checkDataStreamConflict(): Promise<Error | null> {
    try {
      const existing = await this.dependencies.esClient.indices.getDataStream({
        name: this._definition.name,
      });
      if (existing.data_streams.length > 0) {
        const managedByStreams =
          existing.data_streams[0]._meta?.managed_by === 'streams';
        if (!managedByStreams) {
          return new Error(
            `Cannot create graph stream "${this._definition.name}": a data stream with that name already exists`
          );
        }
      }
    } catch (err) {
      if (!isNotFoundError(err) && !isDefinitionNotFoundError(err)) {
        throw err;
      }
    }
    return null;
  }

  private async checkDataStreamExists(): Promise<{ existsAsManagedDataStream: boolean }> {
    try {
      const response = await this.dependencies.esClient.indices.getDataStream({
        name: this._definition.name,
      });
      const existsAsManagedDataStream =
        response.data_streams.length === 1 &&
        response.data_streams[0]._meta?.managed_by === 'streams';
      return { existsAsManagedDataStream };
    } catch (err) {
      if (isNotFoundError(err)) {
        return { existsAsManagedDataStream: false };
      }
      throw err;
    }
  }

  private detectCycleOrDepthViolation(desiredState: State): Error | null {
    // Build adjacency map from all graph nodes in desired state
    const adjacency = new Map<string, string[]>();
    for (const record of desiredState.all()) {
      if (Streams.GraphStream.Definition.is(record.definition) && !record.isDeleted()) {
        adjacency.set(
          record.definition.name,
          record.definition.ingest.graph.routing.map((r) => r.destination)
        );
      }
    }

    // DFS from each node to detect cycles and measure max depth
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (node: string, depth: number): string | null => {
      if (inStack.has(node)) return `Cycle detected in graph stream routing involving "${node}"`;
      if (visited.has(node)) return null;
      if (depth > GRAPH_STREAM_MAX_DEPTH) {
        return `Graph stream routing depth exceeds soft limit of ${GRAPH_STREAM_MAX_DEPTH}`;
      }

      inStack.add(node);
      for (const dest of adjacency.get(node) ?? []) {
        const err = dfs(dest, depth + 1);
        if (err) return err;
      }
      inStack.delete(node);
      visited.add(node);
      return null;
    };

    for (const node of adjacency.keys()) {
      const err = dfs(node, 0);
      if (err) return new Error(err);
    }
    return null;
  }

  public hasChangedFields(): boolean {
    return this._changes.ownFields;
  }

  public hasChangedSettings(): boolean {
    return this._changes.settings;
  }
}
