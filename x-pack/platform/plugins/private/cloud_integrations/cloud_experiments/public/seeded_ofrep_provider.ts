/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { OFREPWebProviderOptions } from '@openfeature/ofrep-web-provider';
import { OFREPWebProvider } from '@openfeature/ofrep-web-provider';
import type {
  EvaluationContext,
  JsonValue,
  Logger as OpenFeatureLogger,
  Provider,
  ResolutionDetails,
} from '@openfeature/web-sdk';
import {
  ClientProviderEvents,
  ErrorCode,
  OpenFeatureEventEmitter,
  StandardResolutionReasons,
} from '@openfeature/web-sdk';

type FlagValueType = 'boolean' | 'string' | 'number' | 'object';

/** The slice of {@link OFREPWebProvider} this provider delegates to after the first fetch. */
interface OfrepWebDelegate {
  initialize(context?: EvaluationContext, domain?: string): Promise<void>;
  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<boolean>;
  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<string>;
  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<number>;
  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<T>;
  onContextChange?(
    oldContext: EvaluationContext,
    newContext: EvaluationContext
  ): Promise<void> | void;
  onClose?(): Promise<void>;
  events?: OpenFeatureEventEmitter;
  /** Full OFREP evaluations keyed by flag key, as exposed by the web provider. */
  readonly flagCache: Record<string, unknown>;
}

const readFlagValue = (entry: unknown): unknown => {
  if (entry !== null && typeof entry === 'object' && 'value' in entry) {
    return entry.value;
  }
  return undefined;
};

export interface SeededOfrepWebProviderOptions {
  ofrep: OFREPWebProviderOptions;
  /** Values injected by Kibana from the server evaluation, served until the web provider has fetched. */
  initialFlags: Record<string, unknown>;
  logger?: Pick<Logger, 'warn'>;
  /** Test seam. Defaults to {@link OFREPWebProvider}. */
  createProvider?: (options: OFREPWebProviderOptions) => OfrepWebDelegate;
}

const valueMatchesType = (value: unknown, type: FlagValueType): boolean => {
  if (type === 'object') {
    return typeof value === 'object';
  }
  return typeof value === type;
};

const sameValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  return typeof left === 'object' && typeof right === 'object'
    ? JSON.stringify(left) === JSON.stringify(right)
    : false;
};

/**
 * Browser provider that serves Kibana's injected flag values immediately, then delegates to
 * {@link OFREPWebProvider} once that provider has completed its own bulk evaluation.
 *
 * The web provider has no bootstrap option, and its local cache stores full OFREP responses
 * under a private key, so the injected value map cannot be written into it.
 */
export class SeededOfrepWebProvider implements Provider {
  readonly runsOn = 'client';
  readonly domainScoped = true;
  readonly metadata = { name: 'Seeded OFREP web provider' };
  readonly events = new OpenFeatureEventEmitter();

  private readonly initialFlags: Record<string, unknown>;
  private readonly inner: OfrepWebDelegate;
  private readonly logger?: Pick<Logger, 'warn'>;
  /** Last values handed out, so later polls report changes against those rather than the seed. */
  private published: Record<string, unknown>;
  private context?: EvaluationContext;
  private domain?: string;
  /** True once the web provider's first evaluation has replaced the injected values. */
  private delegating = false;
  private closed = false;

  constructor(options: SeededOfrepWebProviderOptions) {
    this.initialFlags = options.initialFlags;
    this.published = { ...options.initialFlags };
    this.logger = options.logger;
    this.inner = options.createProvider
      ? options.createProvider(options.ofrep)
      : new OFREPWebProvider(options.ofrep);
    this.forwardEvents();
  }

  async initialize(context?: EvaluationContext, domain?: string): Promise<void> {
    this.context = context;
    this.domain = domain;
    const starting = this.activate();
    // No seed means there is nothing to evaluate until the OFREP server responds.
    if (Object.keys(this.initialFlags).length === 0) {
      await starting;
    }
  }

  onContextChange(
    oldContext: EvaluationContext,
    newContext: EvaluationContext
  ): Promise<void> | void {
    this.context = newContext;
    if (!this.delegating) {
      return;
    }
    return Promise.resolve(this.inner.onContextChange?.(oldContext, newContext)).then(() => {
      this.publishDivergence();
    });
  }

  async onClose(): Promise<void> {
    this.closed = true;
    await this.inner.onClose?.();
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<boolean> {
    return this.delegating
      ? this.inner.resolveBooleanEvaluation(flagKey, defaultValue, context, logger)
      : this.fromSeed(flagKey, defaultValue, 'boolean');
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<string> {
    return this.delegating
      ? this.inner.resolveStringEvaluation(flagKey, defaultValue, context, logger)
      : this.fromSeed(flagKey, defaultValue, 'string');
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<number> {
    return this.delegating
      ? this.inner.resolveNumberEvaluation(flagKey, defaultValue, context, logger)
      : this.fromSeed(flagKey, defaultValue, 'number');
  }

  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: OpenFeatureLogger
  ): ResolutionDetails<T> {
    return this.delegating
      ? this.inner.resolveObjectEvaluation(flagKey, defaultValue, context, logger)
      : this.fromSeed(flagKey, defaultValue, 'object');
  }

  private activate(): Promise<void> {
    const initializedWith = this.context;
    return this.inner
      .initialize(initializedWith, this.domain)
      .then(async () => {
        if (this.closed) {
          return;
        }
        if (this.context !== initializedWith && this.context) {
          await this.inner.onContextChange?.(initializedWith ?? {}, this.context);
        }
        if (this.closed) {
          return;
        }
        this.delegating = true;
        this.publishDivergence();
      })
      .catch((error: unknown) => {
        this.logger?.warn(`OFREP web provider failed to initialize: ${error}`);
        this.events.emit(ClientProviderEvents.Error, {
          message: error instanceof Error ? error.message : String(error),
        });
        if (Object.keys(this.initialFlags).length === 0) {
          throw error;
        }
      });
  }

  private forwardEvents(): void {
    const events = this.inner?.events;
    events?.addHandler(ClientProviderEvents.ConfigurationChanged, (details) => {
      if (this.delegating && details) {
        this.events.emit(ClientProviderEvents.ConfigurationChanged, details);
      }
    });
    events?.addHandler(ClientProviderEvents.Error, (details) => {
      if (this.delegating && details) {
        this.events.emit(ClientProviderEvents.Error, details);
      }
    });
    events?.addHandler(ClientProviderEvents.Stale, (details) => {
      if (this.delegating && details) {
        this.events.emit(ClientProviderEvents.Stale, details);
      }
    });
  }

  /** Tells subscribers to re-read flags whose value changed since the last evaluation. */
  private publishDivergence(): void {
    const fetched = this.inner?.flagCache ?? {};
    const current = Object.fromEntries(
      Object.entries(fetched).map(([key, evaluation]) => [key, readFlagValue(evaluation)])
    );
    const keys = new Set([...Object.keys(this.published), ...Object.keys(current)]);
    const flagsChanged = [...keys]
      .filter((key) => !sameValue(this.published[key], current[key]))
      .sort();
    this.published = current;
    if (flagsChanged.length === 0) {
      return;
    }
    this.events.emit(ClientProviderEvents.ConfigurationChanged, { flagsChanged });
  }

  private fromSeed<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    type: FlagValueType
  ): ResolutionDetails<T> {
    if (!(flagKey in this.initialFlags) || this.initialFlags[flagKey] === undefined) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.FLAG_NOT_FOUND,
        errorMessage: `Flag '${flagKey}' was not in the injected feature flags.`,
      };
    }
    const value = this.initialFlags[flagKey];
    if (!valueMatchesType(value, type)) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: `Flag '${flagKey}' is not a ${type}.`,
      };
    }
    return { value: value as T, reason: StandardResolutionReasons.STATIC };
  }
}
