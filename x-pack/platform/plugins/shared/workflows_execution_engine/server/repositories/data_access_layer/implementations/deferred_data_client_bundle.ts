/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { instrumentAsyncMethods } from '@kbn/apm-utils';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import { DataStreamDataClientBundle } from './data_stream/data_stream_data_client_bundle';
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
  private startPromise: Promise<void> | undefined;
  private setupPromise: Promise<void> | undefined;
  private coreSetup: CoreSetup | undefined;
  private coreStart: CoreStart | undefined;

  constructor(private readonly deps: DeferredDataClientBundleDeps) {
    this.source = deps.source;
    this.dataClientBundle = this.createDataClientBundle(deps.source);
  }

  initSetup(coreSetup: CoreSetup): Promise<void> {
    this.coreSetup = coreSetup;
    if (!this.setupPromise) {
      const bundle = this.dataClientBundle;
      this.setupPromise = bundle.initSetup(coreSetup);
    }
    return this.setupPromise;
  }

  initStart(coreStart: CoreStart): Promise<void> {
    if (!this.setupPromise) {
      throw new Error('initSetup must be called first');
    }

    this.coreStart = coreStart;

    if (!this.startPromise) {
      const bundle = this.dataClientBundle;
      const setupPromise = this.setupPromise;
      this.startPromise = setupPromise.then(() => bundle.initStart(coreStart));
    }
    return this.startPromise;
  }

  stop(): Promise<void> {
    return this.enqueue(() => this.dataClientBundle.stop());
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

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.switchChain.then(task);
    this.switchChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async applySource(source: ExecutionStorageSource): Promise<void> {
    if (source === this.source) {
      return;
    }

    const next = this.createDataClientBundle(source);
    if (this.coreSetup) {
      await next.initSetup(this.coreSetup);
    }
    if (this.coreStart) {
      await next.initStart(this.coreStart);
    }

    const previous = this.dataClientBundle;
    this.dataClientBundle = next;
    this.source = source;
    this.generation += 1;
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

  private deferClient<TExecution extends { id: string }>(
    factory: () => DataClient<TExecution>
  ): DataClient<TExecution> {
    if (!this.startPromise) {
      throw new Error('initStart must be called before creating data clients');
    }

    let resolved: DataClient<TExecution> | undefined;
    let resolvedGeneration = -1;
    const get = (): Promise<DataClient<TExecution>> => {
      const start = this.startPromise;
      if (!start) {
        return Promise.reject(new Error('initStart must be called before creating data clients'));
      }

      return start.then(() => {
        const chain = this.switchChain;
        return chain.then(() => {
          if (this.switchChain !== chain) {
            return get();
          }
          const client =
            resolved !== undefined && resolvedGeneration === this.generation ? resolved : factory();
          resolved = client;
          resolvedGeneration = this.generation;
          return client;
        });
      });
    };
    const deferredClient: DataClient<TExecution> = {
      search: async (r) => get().then((c) => c.search(r)),
      count: async (r) => get().then((c) => c.count(r)),
      getByIds: async (ids, opts) => get().then((c) => c.getByIds(ids, opts)),
      bulk: async (r) => get().then((c) => c.bulk(r)),
      deleteByQuery: async (r) => get().then((c) => c.deleteByQuery(r)),
      refresh: async () => get().then((c) => c.refresh()),
    };

    instrumentAsyncMethods(`DataClientBundle(${this.deps.source})`, deferredClient);

    return deferredClient;
  }
}
