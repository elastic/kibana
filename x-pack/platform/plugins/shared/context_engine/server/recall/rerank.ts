/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InferenceInferenceEndpointInfo,
  InferenceRerankResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { RecallResult } from '../../common/http_api/recall';

export interface RecallReranker {
  rerank(params: { query: string; candidates: readonly RecallResult[] }): Promise<RecallResult[]>;
}

export interface CreateRecallRerankerParams {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly cacheTtlMs?: number;
  readonly getNow?: () => number;
}

interface CachedEndpoint {
  readonly inferenceId: string;
  readonly expiresAtMs: number;
}

type EndpointPredicate = (endpoint: InferenceInferenceEndpointInfo) => boolean;

const DEFAULT_ENDPOINT_CACHE_TTL_MS = 5 * 60 * 1000;
const RERANK_INPUT_CHARS = 1000;
const PREFERRED_EIS_RERANK_ID = '.jina-reranker-v3';

const readModelId = (serviceSettings: unknown): string | undefined => {
  if (typeof serviceSettings !== 'object' || serviceSettings === null) {
    return undefined;
  }
  if (!('model_id' in serviceSettings)) {
    return undefined;
  }
  const { model_id: modelId } = serviceSettings;
  return typeof modelId === 'string' ? modelId : undefined;
};

const isEis: EndpointPredicate = ({ service }) => service === 'elastic';

const isJina: EndpointPredicate = ({ inference_id: inferenceId, service_settings: settings }) =>
  [inferenceId, readModelId(settings)].some((id) => id?.toLowerCase().includes('jina'));

const ENDPOINT_PREFERENCES: readonly EndpointPredicate[] = [
  (endpoint) => isEis(endpoint) && endpoint.inference_id === PREFERRED_EIS_RERANK_ID,
  (endpoint) => isEis(endpoint) && isJina(endpoint),
  isEis,
  ({ service }) => service === 'elasticsearch',
];

const selectEndpoint = (
  endpoints: readonly InferenceInferenceEndpointInfo[]
): InferenceInferenceEndpointInfo | undefined => {
  for (const prefers of ENDPOINT_PREFERENCES) {
    const match = endpoints.find(prefers);
    if (match) {
      return match;
    }
  }
  return endpoints[0];
};

const isNotFound = (error: unknown): boolean => isResponseError(error) && error.statusCode === 404;

const toReranked = (
  candidates: readonly RecallResult[],
  { rerank }: InferenceRerankResponse
): RecallResult[] => {
  const seen = new Set<number>();
  return rerank.flatMap(({ index }) => {
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length || seen.has(index)) {
      return [];
    }
    seen.add(index);
    return [candidates[index]];
  });
};

/**
 * Creates a reranker that orders recall candidates with the best available Elasticsearch rerank inference endpoint.
 */
export const createRecallReranker = ({
  esClient,
  logger,
  cacheTtlMs = DEFAULT_ENDPOINT_CACHE_TTL_MS,
  getNow = Date.now,
}: CreateRecallRerankerParams): RecallReranker => {
  let cached: CachedEndpoint | undefined;
  let inFlightDiscovery: Promise<string> | undefined;

  const getFreshCache = (): CachedEndpoint | undefined =>
    cached !== undefined && cached.expiresAtMs > getNow() ? cached : undefined;

  const discoverEndpointId = async (): Promise<string> => {
    const { endpoints } = await esClient.inference.get({
      inference_id: '_all',
      task_type: 'rerank',
    });
    const endpoint = selectEndpoint(endpoints);
    if (!endpoint) {
      throw new Error('No rerank inference endpoint is available in Elasticsearch');
    }
    cached = { inferenceId: endpoint.inference_id, expiresAtMs: getNow() + cacheTtlMs };
    return endpoint.inference_id;
  };

  const resolveEndpointId = (): Promise<string> => {
    const fresh = getFreshCache();
    if (fresh) {
      return Promise.resolve(fresh.inferenceId);
    }
    inFlightDiscovery ??= discoverEndpointId().finally(() => {
      inFlightDiscovery = undefined;
    });
    return inFlightDiscovery;
  };

  const callRerank = (
    inferenceId: string,
    query: string,
    input: string[]
  ): Promise<InferenceRerankResponse> =>
    esClient.inference.rerank({ inference_id: inferenceId, query, input, return_documents: false });

  const rerankWithRecovery = async (
    query: string,
    input: string[]
  ): Promise<InferenceRerankResponse> => {
    const hadCachedEndpoint = getFreshCache() !== undefined;
    const inferenceId = await resolveEndpointId();
    try {
      return await callRerank(inferenceId, query, input);
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      if (cached?.inferenceId === inferenceId) {
        cached = undefined;
      }
      if (!hadCachedEndpoint) {
        throw error;
      }
      logger.debug(
        `Cached rerank inference endpoint [${inferenceId}] was not found; rediscovering endpoints`
      );
      const refreshedId = await resolveEndpointId();
      if (refreshedId === inferenceId) {
        throw error;
      }
      return callRerank(refreshedId, query, input);
    }
  };

  return {
    rerank: async ({ query, candidates }) => {
      if (candidates.length <= 1) {
        return [...candidates];
      }
      const input = candidates.map(({ content }) => content.slice(0, RERANK_INPUT_CHARS));
      return toReranked(candidates, await rerankWithRecovery(query, input));
    },
  };
};
