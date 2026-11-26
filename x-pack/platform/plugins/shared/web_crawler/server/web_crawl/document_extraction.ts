/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

const DOCUMENT_EXTRACTION_TASK_TYPE = 'document_extraction';
const ELASTIC_INFERENCE_SERVICE = 'elastic';
// A page that takes longer than this holds up an extraction slot for little gain.
const EXTRACTION_TIMEOUT = '30s';
const EXTRACTION_REQUEST_TIMEOUT_MS = 45_000;
const TOO_MANY_REQUESTS = 429;
export const RATE_LIMIT_RETRY_DELAYS_MS = [1_000, 4_000];

interface InferenceEndpoint {
  inference_id: string;
  service: string;
}

interface DocumentExtractionResponse {
  document_extraction: Array<{
    content: string;
    format: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface ExtractedPage {
  content: string;
  title?: string;
  description?: string;
}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

export interface DocumentExtractionEndpoint {
  inferenceId: string;
  service: string;
}

/**
 * Lists the `document_extraction` endpoints a crawl can use. The Elastic Inference Service ones
 * come first, so the first endpoint is the one to crawl with when none is asked for.
 */
export const listDocumentExtractionEndpoints = async (
  esClient: ElasticsearchClient
): Promise<DocumentExtractionEndpoint[]> => {
  const { endpoints } = await esClient.transport.request<{ endpoints: InferenceEndpoint[] }>({
    method: 'GET',
    path: `/_inference/${DOCUMENT_EXTRACTION_TASK_TYPE}/_all`,
  });
  const isElastic = ({ service }: InferenceEndpoint) => service === ELASTIC_INFERENCE_SERVICE;

  return [
    ...endpoints.filter(isElastic),
    ...endpoints.filter((endpoint) => !isElastic(endpoint)),
  ].map(({ inference_id: inferenceId, service }) => ({ inferenceId, service }));
};

export const waitFor = (delayMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    signal.addEventListener('abort', finish, { once: true });
  });

const requestExtraction = (
  esClient: ElasticsearchClient,
  { inferenceId, url, signal }: ExtractPageOptions
): Promise<DocumentExtractionResponse> =>
  esClient.transport.request<DocumentExtractionResponse>(
    {
      method: 'POST',
      path: `/_inference/${DOCUMENT_EXTRACTION_TASK_TYPE}/${encodeURIComponent(inferenceId)}`,
      querystring: { timeout: EXTRACTION_TIMEOUT },
      body: { input: { content: { type: 'html', format: 'url', value: url } } },
    },
    { signal, requestTimeout: EXTRACTION_REQUEST_TIMEOUT_MS, maxRetries: 0 }
  );

interface ExtractPageOptions {
  inferenceId: string;
  url: string;
  signal: AbortSignal;
  /** Awaited before a request is sent again, on top of the backoff. */
  beforeRetry?: () => Promise<void>;
}

/**
 * Has the inference endpoint fetch a web page and return it as markdown, backing off and trying
 * again when the endpoint is rate limiting.
 */
export const extractPage = async (
  esClient: ElasticsearchClient,
  options: ExtractPageOptions
): Promise<ExtractedPage | undefined> => {
  let response: DocumentExtractionResponse | undefined;
  for (let attempt = 0; response === undefined; attempt++) {
    try {
      response = await requestExtraction(esClient, options);
    } catch (error) {
      const retryDelayMs = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
      if (
        error?.statusCode !== TOO_MANY_REQUESTS ||
        retryDelayMs === undefined ||
        options.signal.aborted
      ) {
        throw error;
      }
      await waitFor(retryDelayMs, options.signal);
      await options.beforeRetry?.();
      if (options.signal.aborted) {
        throw error;
      }
    }
  }

  const [result] = response.document_extraction;
  if (!asNonEmptyString(result?.content)) {
    return undefined;
  }

  return {
    content: result.content,
    title: asNonEmptyString(result.metadata?.title),
    description: asNonEmptyString(result.metadata?.description),
  };
};
