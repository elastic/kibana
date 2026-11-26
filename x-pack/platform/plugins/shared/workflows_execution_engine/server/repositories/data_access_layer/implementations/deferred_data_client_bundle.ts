/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import {
  STEP_EXECUTIONS_DATA_STREAM_DEFINITION,
  WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION,
} from './data_stream/data_stream_definitions';
import { DataStreamEntityDataClient } from './data_stream/data_stream_entity_data_client';
import { PlainIndexEntityDataClient } from './plain_index/plain_index_entity_data_client';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../mappings/workflow_executions_mappings';
import type {
  DataClient,
  DataClientBundle,
  EntityDataClient,
  ExecutionStorageSource,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../types';

export interface DeferredDataClientBundleDeps {
  source: ExecutionStorageSource;
  dataRetention: string;
  logger: Logger;
}

interface StoragePair {
  workflow: EntityDataClient<WorkflowExecutionsDataClient>;
  step: EntityDataClient<StepExecutionsDataClient>;
}

export class DeferredDataClientBundle implements DataClientBundle {
  private workflow: EntityDataClient<WorkflowExecutionsDataClient>;
  private step: EntityDataClient<StepExecutionsDataClient>;
  private source: ExecutionStorageSource;
  private generation = 0;
  private switchChain: Promise<void> = Promise.resolve();
  private initialStart: Promise<void> | undefined;
  private setupPromise: Promise<void> | undefined;
  private coreStart: CoreStart | undefined;
  private stopped = false;
  private pending: StoragePair | undefined;
  /** Resolves for the backend that is active. An aborted startup init does not reject it. */
  private ready: Promise<void>;
  private markReady!: () => void;
  private failReady!: (error: unknown) => void;
  private readySettled = false;

  constructor(private readonly deps: DeferredDataClientBundleDeps) {
    this.source = deps.source;
    const active = this.createStoragePair(deps.source);
    this.workflow = active.workflow;
    this.step = active.step;
    this.ready = this.createReady();
  }

  /** Registers both storage backends once. Later switches only start the selected one. */
  initSetup(coreSetup: CoreSetup): Promise<void> {
    if (!this.setupPromise) {
      const plain = this.createStoragePair('plain_index');
      const dataStream = this.createStoragePair('data_stream');
      this.setupPromise = Promise.all([
        plain.workflow.initSetup(coreSetup),
        plain.step.initSetup(coreSetup),
        dataStream.workflow.initSetup(coreSetup),
        dataStream.step.initSetup(coreSetup),
      ]).then(() => undefined);
    }
    return this.setupPromise;
  }

  initStart(coreStart: CoreStart): Promise<void> {
    if (!this.setupPromise) {
      throw new Error('initSetup must be called first');
    }

    this.coreStart = coreStart;

    if (this.initialStart) {
      return this.initialStart;
    }

    const workflow = this.workflow;
    const step = this.step;
    const setupPromise = this.setupPromise;
    const run = setupPromise.then(() =>
      Promise.all([workflow.initStart(coreStart), step.initStart(coreStart)]).then(() => undefined)
    );
    this.initialStart = run;
    void run.then(
      () => {
        if (this.workflow === workflow) {
          this.markReady();
        }
      },
      (error: unknown) => {
        if (this.workflow === workflow && !this.stopped) {
          this.failReady(error);
        }
      }
    );
    return run;
  }

  /** Stops the active storage pair and a switch that is still initializing. */
  stop(): Promise<void> {
    this.stopped = true;
    this.failReady(new Error('Workflow execution storage has stopped'));
    const pending = this.stopPair(this.pending);
    const current = this.stopPair({ workflow: this.workflow, step: this.step });
    return Promise.all([pending, current]).then(() => undefined);
  }

  /** Points deferred workflow and step clients at `source`. */
  switchSource(source: ExecutionStorageSource): Promise<void> {
    return this.enqueue(() => this.applySource(source));
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return this.deferClient(() => this.workflow.createClient());
  }

  createStepDataClient(): StepExecutionsDataClient {
    return this.deferClient(() => this.step.createClient());
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.switchChain.then(task);
    this.switchChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async applySource(source: ExecutionStorageSource): Promise<void> {
    if (this.stopped || source === this.source) {
      return;
    }

    const next = this.createStoragePair(source);
    if (this.coreStart) {
      this.pending = next;
      try {
        await Promise.all([
          next.workflow.initStart(this.coreStart),
          next.step.initStart(this.coreStart),
        ]);
      } finally {
        if (this.pending === next) {
          this.pending = undefined;
        }
      }
    }

    if (this.stopped) {
      await this.stopPair(next);
      return;
    }

    const previous = { workflow: this.workflow, step: this.step };
    this.workflow = next.workflow;
    this.step = next.step;
    this.source = source;
    this.generation += 1;
    this.markReady();
    await this.stopPair(previous);
  }

  private createStoragePair(source: ExecutionStorageSource): StoragePair {
    const { logger, dataRetention } = this.deps;
    switch (source) {
      case 'plain_index':
        return {
          workflow: new PlainIndexEntityDataClient<EsWorkflowExecution>({
            logger,
            indexName: WORKFLOWS_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
          }),
          step: new PlainIndexEntityDataClient<EsWorkflowStepExecution>({
            logger,
            indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
          }),
        };
      case 'data_stream':
        return {
          workflow: new DataStreamEntityDataClient<EsWorkflowExecution>({
            logger,
            dataRetention,
            definition: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION,
            dateField: 'createdAt',
            additionalIndexesToQuery: [WORKFLOWS_EXECUTIONS_INDEX],
          }),
          step: new DataStreamEntityDataClient<EsWorkflowStepExecution>({
            logger,
            dataRetention,
            definition: STEP_EXECUTIONS_DATA_STREAM_DEFINITION,
            dateField: 'startedAt',
            additionalIndexesToQuery: [WORKFLOWS_STEP_EXECUTIONS_INDEX],
          }),
        };
      default: {
        const unexpected: never = source;
        throw new Error(`Unsupported storage source: ${unexpected}`);
      }
    }
  }

  private stopPair(pair: StoragePair | undefined): Promise<void> {
    if (!pair) {
      return Promise.resolve();
    }
    return Promise.all([pair.workflow.stop(), pair.step.stop()]).then(() => undefined);
  }

  private createReady(): Promise<void> {
    this.readySettled = false;
    const ready = new Promise<void>((resolve, reject) => {
      this.markReady = () => {
        if (!this.readySettled) {
          this.readySettled = true;
          resolve();
        }
      };
      this.failReady = (error: unknown) => {
        if (!this.readySettled) {
          this.readySettled = true;
          reject(error);
        }
      };
    });
    void ready.catch(() => undefined);
    return ready;
  }

  private deferClient<TExecution extends { id: string }>(
    factory: () => DataClient<TExecution>
  ): DataClient<TExecution> {
    if (!this.initialStart) {
      throw new Error('initStart must be called before creating data clients');
    }

    let resolved: DataClient<TExecution> | undefined;
    let resolvedGeneration = -1;
    const get = (): Promise<{ client: DataClient<TExecution>; source: ExecutionStorageSource }> => {
      return this.ready.then(() => {
        if (this.stopped) {
          throw new Error('Workflow execution storage has stopped');
        }
        const source = this.source;
        const client =
          resolved !== undefined && resolvedGeneration === this.generation ? resolved : factory();
        resolved = client;
        resolvedGeneration = this.generation;
        return { client, source };
      });
    };
    const call = <T>(
      method: string,
      operation: (client: DataClient<TExecution>) => Promise<T>
    ): Promise<T> =>
      get().then(({ client, source }) =>
        withSpan(`DataClientBundle(${source}).${method}`, () => operation(client))
      );

    return {
      search: (request) => call('search', (client) => client.search(request)),
      count: (request) => call('count', (client) => client.count(request)),
      getByIds: (ids, options) => call('getByIds', (client) => client.getByIds(ids, options)),
      bulk: (request) => call('bulk', (client) => client.bulk(request)),
      deleteByQuery: (request) => call('deleteByQuery', (client) => client.deleteByQuery(request)),
      refresh: () => call('refresh', (client) => client.refresh()),
    };
  }
}
