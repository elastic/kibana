/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import { DataStreamDataClientBundle } from './data_stream/data_stream_data_client_bundle';
import type { ExecutionsIoClient } from './executions_io/executions_io_data_client';
import { PlainIndexDataClientBundle } from './plain_index/plain_index_data_client_bundle';
import type {
  DataClient,
  DataClientBundle,
  ExecutionStorageSource,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../types';

export interface DeferredDataClientBundleDeps {
  source: ExecutionStorageSource;
  dataRetention: string;
  logger: Logger;
}

export class DeferredDataClientBundle implements DataClientBundle {
  private dataClientBundle: DataClientBundle;
  private source: ExecutionStorageSource;
  private generation = 0;
  private switchChain: Promise<void> = Promise.resolve();
  private initialStart: Promise<void> | undefined;
  private setupPromise: Promise<void> | undefined;
  private coreStart: CoreStart | undefined;
  private stopped = false;
  private pendingBundle: DataClientBundle | undefined;
  /** Resolves for the backend that is active. An aborted startup init does not reject it. */
  private ready: Promise<void>;
  private markReady!: () => void;
  private failReady!: (error: unknown) => void;
  private readySettled = false;

  constructor(private readonly deps: DeferredDataClientBundleDeps) {
    this.source = deps.source;
    this.dataClientBundle = this.createDataClientBundle(deps.source);
    this.ready = this.createReady();
  }

  /** Registers both backends once. Later switches only start the selected one. */
  initSetup(coreSetup: CoreSetup): Promise<void> {
    if (!this.setupPromise) {
      const plain = new PlainIndexDataClientBundle(this.deps);
      const dataStream = new DataStreamDataClientBundle(this.deps);
      this.setupPromise = Promise.all([
        plain.initSetup(coreSetup),
        dataStream.initSetup(coreSetup),
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

    const bundle = this.dataClientBundle;
    const setupPromise = this.setupPromise;
    const run = setupPromise.then(() => bundle.initStart(coreStart));
    this.initialStart = run;
    void run.then(
      () => {
        if (this.dataClientBundle === bundle) {
          this.markReady();
        }
      },
      (error: unknown) => {
        if (this.dataClientBundle === bundle && !this.stopped) {
          this.failReady(error);
        }
      }
    );
    return run;
  }

  /** Stops the active backend and cancels a switch that is still initializing. */
  stop(): Promise<void> {
    this.stopped = true;
    this.failReady(new Error('Workflow execution storage has stopped'));
    const pending = this.pendingBundle?.stop() ?? Promise.resolve();
    const current = this.dataClientBundle.stop();
    return Promise.all([pending, current]).then(() => undefined);
  }

  /** Points deferred clients at `source`, initializing that backend when setup or start has already run. */
  switchSource(source: ExecutionStorageSource): Promise<void> {
    return this.enqueue(() => this.applySource(source));
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return this.deferClient(() => this.dataClientBundle.createWorkflowDataClient());
  }

  createStepDataClient(): StepExecutionsDataClient {
    return this.deferClient(() => this.dataClientBundle.createStepDataClient());
  }

  createIoDataClient(): ExecutionsIoClient {
    if (!this.initialStart) {
      throw new Error('initStart must be called before creating data clients');
    }

    let resolved: ExecutionsIoClient | undefined;
    let resolvedGeneration = -1;
    const get = (): Promise<{ client: ExecutionsIoClient; source: ExecutionStorageSource }> =>
      this.ready.then(() => {
        if (this.stopped) {
          throw new Error('Workflow execution storage has stopped');
        }
        const source = this.source;
        const client =
          resolved !== undefined && resolvedGeneration === this.generation
            ? resolved
            : this.dataClientBundle.createIoDataClient();
        resolved = client;
        resolvedGeneration = this.generation;
        return { client, source };
      });
    const call = <T>(
      method: string,
      operation: (client: ExecutionsIoClient) => Promise<T>
    ): Promise<T> =>
      get().then(({ client, source }) =>
        withSpan(`DataClientBundle(${source}).${method}`, () => operation(client))
      );

    return {
      getByIds: (ids, options) => call('getByIds', (client) => client.getByIds(ids, options)),
      bulkCreate: (request) => call('bulkCreate', (client) => client.bulkCreate(request)),
    };
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

    const next = this.createDataClientBundle(source);
    if (this.coreStart) {
      this.pendingBundle = next;
      try {
        await next.initStart(this.coreStart);
      } finally {
        if (this.pendingBundle === next) {
          this.pendingBundle = undefined;
        }
      }
    }

    if (this.stopped) {
      await next.stop();
      return;
    }

    const previous = this.dataClientBundle;
    this.dataClientBundle = next;
    this.source = source;
    this.generation += 1;
    this.markReady();
    await previous.stop();
  }

  private createDataClientBundle(source: ExecutionStorageSource): DataClientBundle {
    const deps = { ...this.deps, source };
    switch (source) {
      case 'plain_index':
        return new PlainIndexDataClientBundle(deps);
      case 'data_stream':
        return new DataStreamDataClientBundle(deps);
      default: {
        const unexpected: never = source;
        throw new Error(`Unsupported storage source: ${unexpected}`);
      }
    }
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
