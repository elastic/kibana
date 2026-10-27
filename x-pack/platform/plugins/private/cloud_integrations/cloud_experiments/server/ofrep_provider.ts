/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  EvaluationContext,
  JsonValue,
  Logger as OpenFeatureLogger,
  Provider,
  ResolutionDetails,
} from '@openfeature/server-sdk';
import {
  ErrorCode,
  OpenFeatureEventEmitter,
  ServerProviderEvents,
  StandardResolutionReasons,
} from '@openfeature/server-sdk';

const FAILURE_BACKOFF_MS = 5_000;

interface OfrepBulkEvaluation {
  key?: string;
  value?: unknown;
  errorCode?: string;
}

interface OfrepBulkResponse {
  flags?: OfrepBulkEvaluation[];
}

/** A 304 keeps the flags already cached for this context. A 200 replaces them. */
type BulkEvaluation =
  | { notModified: true; etag?: string }
  | { notModified: false; flags: Record<string, unknown>; etag?: string };

export interface CachedOfrepProviderOptions {
  baseUrl: string;
  sdkKey: string;
  /** How often to re-evaluate every flag. Zero or negative disables polling. */
  pollIntervalMs: number;
  logger?: Pick<Logger, 'warn'>;
  fetchImpl?: typeof fetch;
}

type FlagValueType = 'boolean' | 'string' | 'number' | 'object';

/**
 * Stable encoding so two contexts (or flag values) compare equal regardless of key order.
 * Dates are encoded as ISO strings, which is how Kibana's evaluation context stores them.
 */
const stableSerialize = (value: unknown): string => {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
};

const changedFlagKeys = (
  previous: Record<string, unknown>,
  next: Record<string, unknown>
): string[] => {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return [...keys]
    .filter((key) => stableSerialize(previous[key]) !== stableSerialize(next[key]))
    .sort();
};

const valueMatchesType = (value: unknown, type: FlagValueType): value is JsonValue => {
  if (type === 'object') {
    return value !== null && typeof value === 'object';
  }
  return typeof value === type;
};

/**
 * Server OpenFeature provider for Kibana's single evaluation context.
 *
 * The official OFREP server provider calls the single-flag endpoint on every evaluation.
 * Kibana evaluates the same flags repeatedly and only republishes them when a provider
 * emits {@link ServerProviderEvents.ConfigurationChanged}, so this provider polls the bulk
 * endpoint and resolves from the cached response. Polls for a context send the ETag from the
 * last bulk response for that context. A 304 keeps the cached flags.
 *
 * The server SDK does not notify providers of context changes. Each evaluation carries the
 * current context, and a change triggers one new bulk evaluation.
 */
export class CachedOfrepProvider implements Provider {
  readonly runsOn = 'server';
  readonly metadata = { name: 'OFREP bulk cache' };
  readonly events = new OpenFeatureEventEmitter();

  private readonly pollIntervalMs: number;
  private readonly fetchImpl: typeof fetch;
  private flags: Record<string, unknown> = {};
  private context: EvaluationContext = {};
  private loadedKey?: string;
  /** ETag of the last bulk response for {@link etagKey}. */
  private etag?: string;
  private etagKey?: string;
  /** Context key of the latest attempt, including attempts that failed. */
  private attemptedKey?: string;
  private stale = false;
  private closed = false;
  private retryNotBefore = 0;
  private timer?: ReturnType<typeof setInterval>;
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly options: CachedOfrepProviderOptions) {
    this.pollIntervalMs = options.pollIntervalMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async initialize(context?: EvaluationContext): Promise<void> {
    this.context = context ?? {};
    await this.schedule(true);
    this.startPolling();
  }

  /**
   * Returns every successfully evaluated flag for `context`.
   * Uses the cached bulk response when it was loaded for this context; otherwise evaluates and stores it.
   */
  async getBulkFlagValues(
    context: EvaluationContext = this.context
  ): Promise<Record<string, unknown>> {
    this.context = context ?? {};
    await this.schedule(false);
    if (stableSerialize(this.context) !== this.loadedKey) {
      await this.schedule(true);
    }
    // A failed evaluation must not hand back flags that were loaded for a different context.
    if (stableSerialize(this.context) !== this.loadedKey) {
      return {};
    }
    return { ...this.flags };
  }

  async onClose(): Promise<void> {
    this.closed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): Promise<ResolutionDetails<boolean>> {
    return this.resolve(flagKey, defaultValue, context, 'boolean', logger);
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): Promise<ResolutionDetails<string>> {
    return this.resolve(flagKey, defaultValue, context, 'string', logger);
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): Promise<ResolutionDetails<number>> {
    return this.resolve(flagKey, defaultValue, context, 'number', logger);
  }

  resolveObjectEvaluation<U extends JsonValue>(
    flagKey: string,
    defaultValue: U,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): Promise<ResolutionDetails<U>> {
    return this.resolve(flagKey, defaultValue, context, 'object', logger);
  }

  private async resolve<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    type: FlagValueType,
    _logger: OpenFeatureLogger
  ): Promise<ResolutionDetails<T>> {
    this.context = context ?? {};
    await this.schedule(false);
    if (stableSerialize(this.context) !== this.loadedKey) {
      // The in-flight evaluation used an older context. Evaluate this one.
      await this.schedule(false);
    }
    return this.details(flagKey, defaultValue, type);
  }

  private details<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    type: FlagValueType
  ): ResolutionDetails<T> {
    const value = this.flags[flagKey];
    if (value === undefined) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.FLAG_NOT_FOUND,
        errorMessage: `Flag '${flagKey}' was not in the last OFREP bulk evaluation.`,
      };
    }
    if (!valueMatchesType(value, type)) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: `Flag '${flagKey}' is not a ${type}.`,
      };
    }
    return {
      value: value as T,
      reason: this.stale ? StandardResolutionReasons.STALE : StandardResolutionReasons.CACHED,
    };
  }

  private startPolling(): void {
    if (this.closed || this.pollIntervalMs <= 0 || this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.schedule(true);
    }, this.pollIntervalMs);
    this.timer.unref?.();
  }

  /** Runs one bulk evaluation after any evaluation already in progress. */
  private schedule(force: boolean): Promise<void> {
    const run = this.pending.then(() => this.fetchIfNeeded(force));
    this.pending = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async fetchIfNeeded(force: boolean): Promise<void> {
    if (this.closed) {
      return;
    }
    const context = this.context;
    const key = stableSerialize(context);
    if (!force && key === this.loadedKey) {
      return;
    }
    // A failed attempt for this same context backs off, so evaluations do not each hit the network.
    if (!force && key === this.attemptedKey && Date.now() < this.retryNotBefore) {
      return;
    }
    this.attemptedKey = key;
    try {
      const evaluation = await this.fetchFlagValues(context);
      if (this.closed || stableSerialize(this.context) !== key) {
        return;
      }
      if (!evaluation.notModified) {
        const flagsChanged = changedFlagKeys(this.flags, evaluation.flags);
        this.flags = evaluation.flags;
        if (flagsChanged.length > 0) {
          this.events.emit(ServerProviderEvents.ConfigurationChanged, { flagsChanged });
        }
      }
      this.etag = evaluation.etag;
      this.etagKey = evaluation.etag ? key : undefined;
      this.loadedKey = key;
      this.stale = false;
      this.retryNotBefore = 0;
    } catch (error) {
      this.options.logger?.warn(`OFREP bulk evaluation failed: ${error}`);
      this.stale = this.loadedKey !== undefined;
      this.retryNotBefore = Date.now() + FAILURE_BACKOFF_MS;
    }
  }

  /**
   * Evaluates every flag for one context through OFREP's bulk endpoint.
   * Sends the stored ETag when it belongs to this context. Flags that come back with an error code are omitted.
   */
  private async fetchFlagValues(context: EvaluationContext): Promise<BulkEvaluation> {
    const base = this.options.baseUrl.endsWith('/')
      ? this.options.baseUrl
      : `${this.options.baseUrl}/`;
    const endpoint = new URL('ofrep/v1/evaluate/flags', base);
    const key = stableSerialize(context);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${this.options.sdkKey}`,
    };
    if (this.etag && this.etagKey === key) {
      headers['If-None-Match'] = this.etag;
    }
    const response = await this.fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ context }),
    });
    if (response.status === 304) {
      if (!this.etag || this.etagKey !== key) {
        throw new Error('OFREP bulk evaluation returned 304 without a cached response');
      }
      return { notModified: true, etag: response.headers.get('etag') ?? this.etag };
    }
    if (!response.ok) {
      throw new Error(`OFREP bulk evaluation failed with status ${response.status}`);
    }
    const body = (await response.json()) as OfrepBulkResponse;
    const flags: Record<string, unknown> = {};
    for (const flag of body.flags ?? []) {
      if (flag.key && flag.errorCode === undefined) {
        flags[flag.key] = flag.value;
      }
    }
    return { notModified: false, flags, etag: response.headers.get('etag') ?? undefined };
  }
}
