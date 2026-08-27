/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Observable, type Subscription, of, from } from 'rxjs';
import * as Rx from 'rxjs';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  InferenceGetResponse,
  InferenceInferenceEndpointInfo,
} from '@elastic/elasticsearch/lib/api/types';
import type { InferenceFeatureRegistryStartContract } from '@kbn/search-inference-endpoints/server';
import {
  AGENT_BUILDER_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
} from '@kbn/agent-builder-common/constants';
import { isAbValidated } from './ab_model_compatibility';

const DEFAULT_POLLING_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_ERROR_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const MAIN_CAPABILITIES = ['capable', 'balanced'];
const FAST_CAPABILITIES = ['efficient'];

interface DerivedRecommendations {
  recommended?: string[];
  fast?: string[];
}

type EndpointMetadata = {
  heuristics?: {
    properties?: string[];
    release_date?: string;
    end_of_life_date?: string;
  };
  capability?: string;
  family?: string;
} & Record<string, unknown>;

interface EndpointWithMetadata extends InferenceInferenceEndpointInfo {
  metadata: EndpointMetadata;
}

const hasMetadata = (ep: InferenceInferenceEndpointInfo): ep is EndpointWithMetadata =>
  'metadata' in ep && typeof ep.metadata === 'object' && ep.metadata !== null;

const getMetadata = (endpoint: InferenceInferenceEndpointInfo): EndpointMetadata | undefined =>
  hasMetadata(endpoint) ? endpoint.metadata : undefined;

const isEligibleEndpoint = (endpoint: InferenceInferenceEndpointInfo): boolean => {
  const meta = getMetadata(endpoint);
  return (
    endpoint.task_type === 'chat_completion' &&
    meta != null &&
    (meta.heuristics?.properties ?? []).includes('kibana-connector') &&
    !meta.heuristics?.end_of_life_date
  );
};

/** Returns true when `a` has a more recent release_date than `b`. */
const isNewer = (a: InferenceInferenceEndpointInfo, b: InferenceInferenceEndpointInfo): boolean => {
  const dateA = getMetadata(a)?.heuristics?.release_date;
  const dateB = getMetadata(b)?.heuristics?.release_date;
  if (!dateA) return false;
  if (!dateB) return true;
  return dateA > dateB; // ISO strings compare correctly lexicographically
};

/**
 * For each family, picks the newest endpoint whose capability is in the given list.
 * Returns inference IDs of the winners.
 */
const pickBestPerFamily = (
  endpoints: InferenceInferenceEndpointInfo[],
  capabilities: string[]
): string[] => {
  const byFamily = new Map<string, InferenceInferenceEndpointInfo>();
  for (const ep of endpoints) {
    const meta = getMetadata(ep);
    const capability = meta?.capability;
    const family = meta?.family;
    if (!capability || !family || !capabilities.includes(capability)) continue;
    const current = byFamily.get(family);
    if (!current || isNewer(ep, current)) {
      byFamily.set(family, ep);
    }
  }
  return [...byFamily.values()].map((ep) => ep.inference_id);
};

/**
 * Derives recommended endpoint lists from raw EIS endpoint data.
 *
 * Returns null when EIS capability/family fields are not yet deployed (safe no-op),
 * or when the AB validation gate would produce an empty list.
 */
export const deriveRecommendations = (
  endpoints: InferenceInferenceEndpointInfo[]
): DerivedRecommendations | null => {
  const eligible = endpoints.filter(isEligibleEndpoint);

  if (!eligible.some((ep) => getMetadata(ep)?.capability != null)) {
    return null;
  }
  if (!eligible.some((ep) => getMetadata(ep)?.family != null)) {
    return null;
  }

  // Apply AB validation gate before picking — ensures an unvalidated-but-newer model
  // does not displace the newest already-validated model for the same family.
  const validated = eligible.filter((ep) => isAbValidated(ep.inference_id));
  const recommended = pickBestPerFamily(validated, MAIN_CAPABILITIES);
  const fast = pickBestPerFamily(validated, FAST_CAPABILITIES);

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
 * Models must also pass the AB compatibility gate ({@link isAbValidated}) before
 * being promoted to the recommended list.
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
      Rx.tap(this.pollBegin.bind(this)),
      Rx.mergeMap(this.fetchEndpoints.bind(this)),
      Rx.map(this.handleResponse.bind(this)),
      Rx.map(this.deriveRecommendationsWithLogging.bind(this)),
      Rx.tap(this.applyRecommendations.bind(this)),
      Rx.delay(this.pollingIntervalMs),
      Rx.repeat(),
      Rx.catchError(this.handleError.bind(this)),
      Rx.retry({ delay: this.errorRetryIntervalMs })
    );
  }

  private pollBegin() {
    this.logger.debug('Polling EIS for recommended model updates...');
  }

  private fetchEndpoints() {
    return from(this.esClient.inference.get());
  }

  private handleResponse(response: InferenceGetResponse): InferenceInferenceEndpointInfo[] {
    return response.endpoints ?? [];
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
      const mainResult = this.features.updateRecommendedEndpoints(
        AGENT_BUILDER_INFERENCE_FEATURE_ID,
        result.recommended
      );
      if (!mainResult.ok) {
        this.logger.warn(`Failed to update main recommended endpoints: ${mainResult.error}`);
      }
    }

    if (result.fast) {
      const fastResult = this.features.updateRecommendedEndpoints(
        AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
        result.fast
      );
      if (!fastResult.ok) {
        this.logger.warn(`Failed to update fast recommended endpoints: ${fastResult.error}`);
      }
    }
  }

  private handleError(error: unknown, _caught$: Observable<unknown>): Observable<never> {
    // Log at warn, not error: this handler fires on every retry attempt (catchError is
    // inside the retry scope), so a transient ES outage would otherwise flood error logs.
    // Persistent failures are visible through the warn cadence (one entry per 5-minute retry).
    this.logger.warn('Error polling EIS for recommended model updates; will retry.');
    if (Error.isError(error)) {
      this.logger.warn(error.message);
    } else if (typeof error === 'string') {
      this.logger.warn(error);
    } else if (error !== null && typeof error === 'object') {
      this.logger.warn(JSON.stringify(error));
    }
    return Rx.throwError(() => error);
  }
}
