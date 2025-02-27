/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/logging';
import { getDashboard } from './gen_ai_dashboard';

export interface OutputError {
  message: string;
  statusCode: number;
}

export const initDashboard = async ({
  logger,
  savedObjectsClient,
  dashboardId,
  genAIProvider,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  dashboardId: string;
  genAIProvider: 'OpenAI' | 'Bedrock' | 'Gemini' | 'Inference';
}): Promise<{
  success: boolean;
  error?: OutputError;
}> => {
  try {
    await savedObjectsClient.get('dashboard', dashboardId);
    return {
      success: true,
    };
  } catch (error) {
    // if 404, does not yet exist. do not error, continue to create
    if (error.output.statusCode !== 404) {
      return {
        success: false,
        error: {
          message: `${error.output.payload.error}${
            error.output.payload.message ? `: ${error.output.payload.message}` : ''
          }`,
          statusCode: error.output.statusCode,
        },
      };
    }
  }

  try {
    await savedObjectsClient.create(
      'dashboard',
      getDashboard(genAIProvider, dashboardId).attributes,
      {
        overwrite: true,
        id: dashboardId,
      }
    );
    logger.info(`Successfully created Generative AI Dashboard ${dashboardId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: { message: error.message, statusCode: error.output.statusCode },
    };
  }
};
