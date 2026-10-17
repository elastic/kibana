/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { type Observable, type Subscription, of, from } from 'rxjs';
import * as Rx from 'rxjs';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  InferenceGetResponse,
  InferenceInferenceEndpointInfo,
} from '@elastic/elasticsearch/lib/api/types';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import type { InferenceFeatureRegistryStartContract } from '@kbn/search-inference-endpoints/server';
import {
  AGENT_BUILDER_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
} from '@kbn/agent-builder-common/constants';
const DEFAULT_POLLING_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_ERROR_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const MAIN_CAPABILITIES = ['capable', 'balanced'];
const FAST_CAPABILITIES = ['efficient'];

interface DerivedRecommendations {
  recommended?: string[];
  fast?: string[];
}

type EndpointMetadata = EisInferenceEndpointMetadata & {
  capability?: string;
  family?: string;
};

interface EndpointWithMetadata extends InferenceInferenceEndpointInfo {
  metadata: EndpointMetadata;
}

const hasMetadata = (endpoint: InferenceInferenceEndpointInfo): endpoint is EndpointWithMetadata =>
  'metadata' in endpoint && typeof endpoint.metadata === 'object' && endpoint.metadata !== null;

const getMetadata = (endpoint: InferenceInferenceEndpointInfo): EndpointMetadata | undefined =>
  hasMetadata(endpoint) ? endpoint.metadata : undefined;

const isEligibleEndpoint = (endpoint: InferenceInferenceEndpointInfo): boolean => {
  if (endpoint.task_type !== 'chat_completion') {
    return false;
  }
  const meta = getMetadata(endpoint);
  if (meta == null) {
    return false;
  }
  if (!(meta.heuristics?.properties ?? []).includes('kibana-connector')) {
    return false;
  }
  if (meta.heuristics?.end_of_life_date) {
    return false;
  }
  if (meta.capability == null) {
    return false;
  }
  if (meta.family == null) {
    return false;
  }
  return true;
};

/** Returns true when `a` has a more recent release_date than `b`. */
const isNewer = (a: InferenceInferenceEndpointInfo, b: InferenceInferenceEndpointInfo): boolean => {
  const momentA = dateMath.parse(getMetadata(a)?.heuristics?.release_date ?? '');
  const momentB = dateMath.parse(getMetadata(b)?.heuristics?.release_date ?? '');
  if (!momentA?.isValid()) return false;
  if (!momentB?.isValid()) return true;
  return momentA.isAfter(momentB);
};

/**
 * For each family, picks the newest endpoint whose capability is in the given list.
 * Returns inference IDs of the winners.
 */
const pickBestPerFamily = (
  endpoints: InferenceInferenceEndpointInfo[],
  capabilities: string[]
): string[] => {
  const allowedCapabilities = new Set(capabilities);
  const bestByFamily = new Map<string, InferenceInferenceEndpointInfo>();

  for (const endpoint of endpoints) {
    const metadata = getMetadata(endpoint);

    if (metadata?.family == null || !allowedCapabilities.has(metadata.capability ?? '')) {
      continue;
    }

    const { family } = metadata;
    const current = bestByFamily.get(family);

    if (!current || isNewer(endpoint, current)) {
      bestByFamily.set(family, endpoint);
    }
  }

  return Array.from(bestByFamily.values(), (endpoint) => endpoint.inference_id);
};

/**
 * Derives recommended endpoint lists from raw EIS endpoint data.
 *
 * Returns null when EIS capability/family fields are not yet deployed (safe no-op).
 */
export const deriveRecommendations = (
  endpoints: InferenceInferenceEndpointInfo[]
): DerivedRecommendations | null => {
  const eligible = endpoints.filter(isEligibleEndpoint);

  if (eligible.length === 0) {
    return null;
  }

  const recommended = pickBestPerFamily(eligible, MAIN_CAPABILITIES);
  const fast = pickBestPerFamily(eligible, FAST_CAPABILITIES);

  // Each list is applied independently: a partial EIS rollout (e.g. capable/balanced
  // models tagged before any efficient model is validated) still updates the lists
  // that are ready, rather than blocking both until both are non-empty.
  if (recommended.length === 0 && fast.length === 0) {
    return null;
  }

  return {
    ...(recommended.length > 0 ? { recommended } : {}),
    ...(fast.length > 0 ? { fast } : {}),
  };
};

/**
 * Polls EIS for inference endpoint metadata and dynamically updates the
 * Agent Builder recommended model lists without requiring a Kibana release.
 *
 * The poller is a safe no-op until EIS delivers the `capability` and `family`
 * fields (elastic/search-team#15790) — static constants remain active until then.
 */
export class RecommendedEndpointsPoller {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly features: Pick<
    InferenceFeatureRegistryStartContract,
    'updateRecommendedEndpoints'
  >;
  private readonly pollingIntervalMs: number;
  private readonly errorRetryIntervalMs: number;
  private readonly polling$: Observable<unknown>;
  private subscription: Subscription | undefined;

  constructor({
    logger,
    esClient,
    features,
    pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
    errorRetryIntervalMs = DEFAULT_ERROR_RETRY_INTERVAL_MS,
  }: {
    logger: Logger;
    esClient: ElasticsearchClient;
    features: Pick<InferenceFeatureRegistryStartContract, 'updateRecommendedEndpoints'>;
    pollingIntervalMs?: number;
    errorRetryIntervalMs?: number;
  }) {
    this.logger = logger;
    this.esClient = esClient;
    this.features = features;
    this.pollingIntervalMs = pollingIntervalMs;
    this.errorRetryIntervalMs = errorRetryIntervalMs;
    this.polling$ = this.createPollingObservable();
  }

  start() {
    if (this.subscription) {
      this.logger.warn('start called when already running');
      return;
    }
    this.subscription = this.polling$.subscribe();
    this.logger.debug('polling started');
  }

  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
      this.logger.debug('polling stopped');
    }
  }

  private createPollingObservable() {
    return of({}).pipe(
      Rx.tap(() => this.logger.debug('Polling EIS for recommended model updates...')),
      Rx.mergeMap(() => from(this.esClient.inference.get())),
      Rx.map((response: InferenceGetResponse) => response.endpoints ?? []),
      Rx.map((endpoints) => this.deriveRecommendationsWithLogging(endpoints)),
      Rx.tap((result) => this.applyRecommendations(result)),
      Rx.delay(this.pollingIntervalMs),
      Rx.repeat(),
      Rx.catchError((error, caught$) => this.handleError(error, caught$)),
      Rx.retry({ delay: this.errorRetryIntervalMs })
    );
  }

  /**
   * Wraps {@link deriveRecommendations} with debug/warn logging.
   */
  private deriveRecommendationsWithLogging(
    endpoints: InferenceInferenceEndpointInfo[]
  ): DerivedRecommendations | null {
    const result = deriveRecommendations(endpoints);

    if (!result) {
      this.logger.debug(
        'EIS capability/family fields not yet available or no AB-validated models found; retaining static recommended list'
      );
      return null;
    }

    this.logger.debug(
      `Derived recommendations — main: [${result.recommended?.join(', ') ?? 'unchanged'}], fast: [${
        result.fast?.join(', ') ?? 'unchanged'
      }]`
    );
    return result;
  }

  private applyRecommendations(result: DerivedRecommendations | null) {
    if (!result) return;

    if (result.recommended) {
      try {
        this.features.updateRecommendedEndpoints(
          AGENT_BUILDER_INFERENCE_FEATURE_ID,
          result.recommended
        );
      } catch (e) {
        this.logger.warn(
          `Failed to update main recommended endpoints: ${Error.isError(e) ? e.message : String(e)}`
        );
      }
    }

    if (result.fast) {
      try {
        this.features.updateRecommendedEndpoints(
          AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
          result.fast
        );
      } catch (e) {
        this.logger.warn(
          `Failed to update fast recommended endpoints: ${Error.isError(e) ? e.message : String(e)}`
        );
      }
    }
  }

  private handleError(error: unknown, _caught$: Observable<unknown>): Observable<never> {
    // Log at warn, not error: this handler fires on every retry attempt (catchError is
    // inside the retry scope), so a transient ES outage would otherwise flood error logs.
    // Persistent failures are visible through the warn cadence (one entry per 5-minute retry).
    const detail = Error.isError(error) ? error.message : JSON.stringify(error);
    this.logger.warn(`Error polling EIS for recommended model updates; will retry. ${detail}`);
    return Rx.throwError(() => error);
  }
}
