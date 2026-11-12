/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subscription, defer, delay, repeat, retry, tap, timer } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS,
  DOCUMENT_EXTRACTION_AVAILABILITY_RETRY_MS,
  DOCUMENT_EXTRACTION_TASK_TYPE,
  PREFERRED_DOCUMENT_EXTRACTION_ENDPOINT_ID,
} from './constants';

export interface DocumentExtractionAvailability {
  isAvailable: () => boolean;
  getEndpointId: () => string | undefined;
  start: (esClient: ElasticsearchClient) => void;
  stop: () => void;
}

const getStatusCode = (error: unknown): number | undefined =>
  (error as { statusCode?: number } | undefined)?.statusCode;

interface InferenceEndpointsResponse {
  endpoints?: Array<{ inference_id: string }>;
}

const findEndpointId = async (esClient: ElasticsearchClient): Promise<string | undefined> => {
  try {
    const { endpoints = [] } = await esClient.transport.request<InferenceEndpointsResponse>({
      method: 'GET',
      path: `/_inference/${DOCUMENT_EXTRACTION_TASK_TYPE}/_all`,
    });
    const ids = endpoints.map(({ inference_id: id }) => id);
    return ids.includes(PREFERRED_DOCUMENT_EXTRACTION_ENDPOINT_ID)
      ? PREFERRED_DOCUMENT_EXTRACTION_ENDPOINT_ID
      : ids[0];
  } catch (error) {
    if (getStatusCode(error) === 404) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Creates a holder for the document extraction endpoint. `start` looks for an endpoint now and then every hour.
 */
export const createDocumentExtractionAvailability = ({
  logger,
}: {
  logger: Logger;
}): DocumentExtractionAvailability => {
  let endpointId: string | undefined;
  let checked = false;
  let subscription: Subscription | undefined;

  const setEndpointId = (next: string | undefined) => {
    if (checked && next === endpointId) {
      return;
    }
    checked = true;
    endpointId = next;
    logger.info(
      endpointId
        ? `PDF reading is available on this deployment (endpoint "${endpointId}").`
        : 'PDF reading is not available on this deployment.'
    );
  };

  const start = (esClient: ElasticsearchClient) => {
    if (subscription) {
      return;
    }
    subscription = defer(() => findEndpointId(esClient))
      .pipe(
        tap(setEndpointId),
        delay(DOCUMENT_EXTRACTION_AVAILABILITY_INTERVAL_MS),
        repeat(),
        retry({
          delay: (error: Error) => {
            logger.warn(`Could not check the document extraction endpoint: ${error.message}`);
            return timer(DOCUMENT_EXTRACTION_AVAILABILITY_RETRY_MS);
          },
        })
      )
      .subscribe();
  };

  const stop = () => {
    subscription?.unsubscribe();
    subscription = undefined;
  };

  return {
    isAvailable: () => endpointId !== undefined,
    getEndpointId: () => endpointId,
    start,
    stop,
  };
};
