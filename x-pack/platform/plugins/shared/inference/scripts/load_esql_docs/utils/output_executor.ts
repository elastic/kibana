/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputAPI } from '@kbn/inference-common';

export interface Prompt {
  system?: string;
  input: string;
}

export type PromptTemplate<Input> = (input: Input) => Prompt;

export type PromptCaller = (prompt: Prompt) => Promise<string>;

export type PromptCallerFactory = ({
  connectorId,
  output,
  maxRetries,
  retryConfiguration,
}: {
  connectorId: string;
  output: OutputAPI;
  maxRetries?: number;
  retryConfiguration?: {
    retryOn?: 'all' | 'auto';
    initialDelay?: number;
    backoffMultiplier?: number;
  };
}) => PromptCaller;

export const bindOutput: PromptCallerFactory = ({
  connectorId,
  output,
  maxRetries = 5,
  retryConfiguration,
}) => {
  return async ({ input, system }) => {
    let lastError: Error | null = null;
    const initialDelay = retryConfiguration?.initialDelay ?? 2000;
    const backoffMultiplier = retryConfiguration?.backoffMultiplier ?? 2;
    const totalRetries = maxRetries;

    for (let attempt = 0; attempt <= totalRetries; attempt++) {
      try {
        const response = await output({
          id: 'output',
          connectorId,
          input,
          system,
          // Pass through retry config to internal retry mechanism
          maxRetries: retryConfiguration ? 3 : 0, // Use internal retries for non-429 errors
          retryConfiguration: retryConfiguration
            ? {
                retryOn: retryConfiguration.retryOn ?? 'auto',
                initialDelay: retryConfiguration.initialDelay,
                backoffMultiplier: retryConfiguration.backoffMultiplier,
              }
            : undefined,
        });

        return response.content ?? '';
      } catch (error: any) {
        lastError = error;

        // Check if it's a 429 error (rate limit) - handle AxiosError format
        const statusCode =
          error?.response?.status ||
          error?.status ||
          (error?.code === 'ECONNABORTED' ? undefined : error?.response?.statusCode);

        const isRateLimitError =
          statusCode === 429 ||
          (error?.message && error.message.includes('429')) ||
          (error?.message && error.message.includes('Request failed with status code 429'));

        // For 429 errors, we always retry with backoff
        // For other errors, check retry configuration
        const shouldRetry =
          isRateLimitError ||
          retryConfiguration?.retryOn === 'all' ||
          (retryConfiguration?.retryOn === 'auto' && statusCode >= 500 && statusCode < 600);

        if (!shouldRetry || attempt >= totalRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(backoffMultiplier, attempt);

        // Wait before retrying (longer wait for 429 errors - at least 5 seconds)
        const waitTime = isRateLimitError ? Math.max(delay, 5000) : delay;

        // Log retry attempt for debugging
        if (isRateLimitError) {
          // eslint-disable-next-line no-console
          console.warn(
            `Rate limit error (429) on attempt ${attempt + 1}/${
              totalRetries + 1
            }. Retrying in ${waitTime}ms...`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Failed after all retries');
  };
};
