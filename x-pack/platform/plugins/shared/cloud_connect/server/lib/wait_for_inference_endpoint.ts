/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * Well-known EIS inference endpoint ID used to verify CCM setup is complete.
 * This endpoint is created by Elasticsearch when EIS is enabled via CCM.
 */
export const KNOWN_EIS_INFERENCE_ENDPOINT = '.rainbow-sprinkles-elastic';

/**
 * Polls for a known EIS inference endpoint to verify that CCM setup is complete.
 * This is needed because enabling inference CCM takes a few seconds to propagate.
 */
export async function waitForInferenceEndpoint(
  esClient: ElasticsearchClient,
  logger: Logger,
  maxRetries: number = 5,
  delayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await esClient.inference.get({
        task_type: 'chat_completion',
        inference_id: KNOWN_EIS_INFERENCE_ENDPOINT,
      });

      // Check if the endpoint exists in the response
      if (response.endpoints && response.endpoints.length > 0) {
        logger.debug(
          `EIS inference endpoint "${KNOWN_EIS_INFERENCE_ENDPOINT}" found on attempt ${attempt}`
        );
        return true;
      }
    } catch (error) {
      logger.debug(
        `EIS inference endpoint "${KNOWN_EIS_INFERENCE_ENDPOINT}" not found on attempt ${attempt}/${maxRetries}`
      );
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  logger.debug(
    `EIS inference endpoint "${KNOWN_EIS_INFERENCE_ENDPOINT}" not found after ${maxRetries} attempts, proceeding anyway`
  );
  return false;
}
