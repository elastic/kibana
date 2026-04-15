/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
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
    return this.determineDraftCreateActions(desiredState);
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: WiredStream
  ): Promise<ElasticsearchAction[]> {
    // The stream is being materialized.
    if (!this._definition.ingest.wired.draft) {
      return super.doDetermineCreateActions(desiredState);
    }

    return this.determineDraftUpdateActions(desiredState, startingStateStream);
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return this.determineDraftDeleteActions();
  }

  static create(
    definition: Streams.WiredStream.Definition,
    dependencies: StateDependencies
  ): DraftStream {
    return new DraftStream(definition, dependencies);
  }
}
