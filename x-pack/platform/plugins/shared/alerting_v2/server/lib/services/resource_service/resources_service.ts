/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';

import { AlertingRetryService } from '../retry_service/alerting_retry_service';
import type { ResourceInitializer } from './resource_initializer';
import { LoggerService } from '../logger_service/logger_service';

interface ResourceState {
  initializer?: ResourceInitializer;
  promise?: Promise<void>;
  error?: Error;
  status: 'not_started' | 'pending' | 'ready' | 'failed';
}

@injectable()
export class ResourcesService {
  private readonly resources = new Map<string, ResourceState>();
  private readonly startupResourceKeys = new Set<string>();

  constructor(
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(AlertingRetryService) private readonly retryService: AlertingRetryService
  ) {}

  /**
   * Register a resource initializer instance, keyed by a unique name.
   *
   * A resource can later be initialized either at startup (via `startInitialization()`)
   * or on-demand (via `ensureResourceReady()`).
   */
  public registerResource(key: string, initializer: ResourceInitializer): void {
    const existing = this.resources.get(key);
    if (
      existing?.status === 'pending' ||
      existing?.status === 'ready' ||
      existing?.status === 'failed'
    ) {
      throw new Error(
        `ResourcesService: cannot register resource [${key}] after initialization has started`
      );
    }

    this.resources.set(key, {
      status: 'not_started',
      initializer,
    });
  }

  /**
   * Trigger async initialization for a set of resources (or all currently registered ones).
   *
   * This is intended to be called during plugin setup to kick off initialization, while
   * consumers await readiness later (Ready Promise / Async Initializer pattern).
   */
  public startInitialization({ resourceKeys }: { resourceKeys?: string[] } = {}): void {
    const keysToStart = resourceKeys ?? Array.from(this.resources.keys());
    for (const key of keysToStart) {
      this.startupResourceKeys.add(key);

      void this.startResource(key).catch(() => {});
    }
  }

  /**
   * Wait until startup-triggered resources are ready.
   *
   * If initialization permanently fails, this rejects (fail-fast) and subsequent callers will
   * also fail immediately with the stored error.
   */
  public async waitUntilReady(): Promise<void> {
    await Promise.all(
      Array.from(this.startupResourceKeys).map((key) => this.ensureResourceReady(key))
    );
  }

  public isReady(key: string): boolean {
    return this.resources.get(key)?.status === 'ready';
  }

  /**
   * Ensure a resource is ready. If it has never been started, this starts it and awaits completion.
   *
   * If the resource permanently fails (even after retries), this rejects quickly for all callers.
   */
  public async ensureResourceReady(key: string): Promise<void> {
    const state = this.resources.get(key);
    if (!state?.initializer) {
      throw new Error(`ResourcesService: resource [${key}] is not registered`);
    }

    if (state.status === 'failed') {
      const err =
        state.error ?? new Error(`ResourcesService: resource [${key}] failed to initialize`);
      throw err;
    }

    if (state.status === 'ready') {
      return;
    }

    await this.startResource(key);
  }

  /**
   * Ensure a resource is registered and ready (on-demand creation).
   */
  public async ensureResourceRegisteredAndReady(
    key: string,
    initializer: ResourceInitializer
  ): Promise<void> {
    if (!this.resources.has(key)) {
      this.registerResource(key, initializer);
    }
    await this.ensureResourceReady(key);
  }

  private async startResource(key: string): Promise<void> {
    const state = this.resources.get(key);
    if (!state?.initializer) {
      throw new Error(`ResourcesService: resource [${key}] is not registered`);
    }

    if (state.status === 'ready') {
      return;
    }

    if (state.status === 'failed') {
      const err =
        state.error ?? new Error(`ResourcesService: resource [${key}] failed to initialize`);
      throw err;
    }

    if (state.status === 'pending' && state.promise) {
      await state.promise;
      return;
    }

    state.status = 'pending';

    state.promise = (async () => {
      try {
        this.logger.debug({
          message: `ResourcesService: initializing resource [${key}]`,
        });

        await this.retryService.retry(() => state.initializer!.initialize());
        state.status = 'ready';

        this.logger.debug({
          message: `ResourcesService: resource [${key}] is ready`,
        });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        state.status = 'failed';
        state.error = err;

        this.logger.error({
          error: err,
          code: 'ALERTING_RESOURCES_SERVICE_ERROR',
          type: 'AlertingResourcesServiceError',
        });

        throw err;
      }
    })();

    await state.promise;
  }
}
