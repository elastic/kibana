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
  DOCUMENT_EXTRACTION_ENDPOINT_ID,
} from './constants';

export interface DocumentExtractionAvailability {
  isAvailable: () => boolean;
  start: (esClient: ElasticsearchClient) => void;
  stop: () => void;
}

const getStatusCode = (error: unknown): number | undefined =>
  (error as { statusCode?: number } | undefined)?.statusCode;

const findEndpoint = async (esClient: ElasticsearchClient): Promise<boolean> => {
  try {
    const { endpoints } = await esClient.inference.get({
      inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID,
    });
    return endpoints.some(({ inference_id: id }) => id === DOCUMENT_EXTRACTION_ENDPOINT_ID);
  } catch (error) {
    if (getStatusCode(error) === 404) {
      return false;
    }
    throw error;
  }
};

/**
 * Creates a holder for the document extraction state. `start` looks for the endpoint now and then every hour.
 */
export const createDocumentExtractionAvailability = ({
  logger,
}: {
  logger: Logger;
}): DocumentExtractionAvailability => {
  let available: boolean | undefined;
  let subscription: Subscription | undefined;

  const setAvailable = (next: boolean) => {
    if (next === available) {
      return;
    }
    available = next;
    logger.info(`PDF reading is ${available ? 'available' : 'not available'} on this deployment.`);
  };

  const start = (esClient: ElasticsearchClient) => {
    if (subscription) {
      return;
    }
    subscription = defer(() => findEndpoint(esClient))
      .pipe(
        tap(setAvailable),
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

  return { isAvailable: () => available === true, start, stop };
};
