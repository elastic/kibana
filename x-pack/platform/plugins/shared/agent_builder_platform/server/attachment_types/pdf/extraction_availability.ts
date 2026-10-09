/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  DOCUMENT_EXTRACTION_ENDPOINT_ID,
  // FAKE_EXTRACTION:start - remove when Jina Reader document_extraction is live
  USE_FAKE_EXTRACTION,
  // FAKE_EXTRACTION:end
} from './constants';

let available = false;
let availabilityCheck: Promise<void> | undefined;

export const isPdfExtractionAvailable = (): boolean => {
  // FAKE_EXTRACTION:start - remove when Jina Reader document_extraction is live
  if (USE_FAKE_EXTRACTION) {
    return true;
  }
  // FAKE_EXTRACTION:end
  return available;
};

const getStatusCode = (error: unknown): number | undefined =>
  (error as { statusCode?: number } | undefined)?.statusCode;

/**
 * Looks for the document extraction endpoint once. Later calls reuse the first result.
 */
export const checkPdfExtractionAvailability = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  availabilityCheck ??= (async () => {
    try {
      const { endpoints } = await esClient.inference.get({
        inference_id: DOCUMENT_EXTRACTION_ENDPOINT_ID,
      });
      available = endpoints.some(({ inference_id: id }) => id === DOCUMENT_EXTRACTION_ENDPOINT_ID);
    } catch (error) {
      available = false;
      if (getStatusCode(error) !== 404) {
        logger.warn(
          `Could not check the document extraction endpoint: ${(error as Error).message}`
        );
      }
    }
    logger.info(`PDF reading is ${available ? 'available' : 'not available'} on this deployment.`);
  })();
  return availabilityCheck;
};
