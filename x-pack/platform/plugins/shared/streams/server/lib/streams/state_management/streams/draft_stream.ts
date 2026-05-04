/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, getEsqlViewName, definitionToESQLQuery, getParentId } from '@kbn/streams-schema';
import { cloneDeep, isEqual } from 'lodash';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies } from '../types';
import type { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import { WiredStream } from './wired_stream';

/**
 * Handles wired streams that are in draft mode (`draft: true`).
 *
 * Draft streams exist only as a `.streams` document and an ES|QL view —
 * they have no backing data stream, component/index templates, or ingest
 * pipelines. When a draft is materialized (updated with `draft: false`),
 * it delegates to the parent WiredStream's full create logic.
 */
export class DraftStream extends WiredStream {
  protected doClone(): StreamActiveRecord<Streams.WiredStream.Definition> {
    return new DraftStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]> {
    const routingCondition = this.getRoutingConditionFromParent(desiredState);
    return [
      { type: 'upsert_dot_streams_document', request: this._definition },
      {
        type: 'upsert_esql_view',
        request: {
          name: getEsqlViewName(this._definition.name),
          query: await definitionToESQLQuery({
            definition: this._definition,
            routingCondition,
          }),
        },
      },
    ];
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: WiredStream
  ): Promise<ElasticsearchAction[]> {
    if (!this._definition.ingest.wired.draft) {
      return super.doDetermineCreateActions(desiredState);
    }

    const actions: ElasticsearchAction[] = [];

    const routingCondition = this.getRoutingConditionFromParent(desiredState);
    actions.push({
      type: 'upsert_esql_view',
      request: {
        name: getEsqlViewName(this._definition.name),
        query: await definitionToESQLQuery({
          definition: this._definition,
          routingCondition,
        }),
      },
    });

    const definitionChanged = !isEqual(startingStateStream.definition, this._definition);
    if (definitionChanged) {
      actions.push({
        type: 'upsert_dot_streams_document',
        request: this._definition,
      });
    }

    return actions;
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      { type: 'delete_dot_streams_document', request: { name: this._definition.name } },
      { type: 'delete_esql_view', request: { name: getEsqlViewName(this._definition.name) } },
      { type: 'delete_queries', request: { definition: this._definition } },
      { type: 'unlink_assets', request: { name: this._definition.name } },
      { type: 'unlink_systems', request: { name: this._definition.name } },
      { type: 'unlink_features', request: { name: this._definition.name } },
    ];
  }

  private getRoutingConditionFromParent(desiredState: State) {
    const parentId = getParentId(this._definition.name);
    if (!parentId) {
      throw new Error(`Draft stream "${this._definition.name}" must have a parent stream`);
    }
    const parent = desiredState.get(parentId);
    if (!parent || !Streams.WiredStream.Definition.is(parent.definition)) {
      throw new Error(`Parent stream "${parentId}" not found or not a wired stream`);
    }
    const routingEntry = parent.definition.ingest.wired.routing.find(
      (r) => r.destination === this._definition.name
    );
    if (!routingEntry) {
      throw new Error(`No routing entry for "${this._definition.name}" in parent "${parentId}"`);
    }
    return routingEntry.where;
  }

  static create(
    definition: Streams.WiredStream.Definition,
    dependencies: StateDependencies
  ): DraftStream {
    return new DraftStream(definition, dependencies);
  }
}
