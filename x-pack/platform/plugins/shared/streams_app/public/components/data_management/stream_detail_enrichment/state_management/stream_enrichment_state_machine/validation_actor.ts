/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromPromise } from 'xstate5';
import { convertUIStepsToDSL, type StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stepCount: number;
  validatedAt: string;
}

export interface ValidationInput {
  steps: StreamlangStepWithUIAttributes[];
  streamName: string;
}

export function createValidationActor({
  streamsRepositoryClient,
  toasts,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  toasts: IToasts;
}) {
  return fromPromise<ValidationResult, ValidationInput>(async ({ input, signal }) => {
    try {
      const { steps, streamName } = input;

      // Call the actual validation endpoint
      const result = await streamsRepositoryClient.fetch(
        `POST /internal/streams/{name}/processing/_validate`,
        {
          params: {
            path: { name: streamName },
            body: {
              processing: convertUIStepsToDSL(steps, true),
            },
          },
          signal,
        }
      );

      // Transform the API response to match our ValidationResult interface
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!result.valid && result.error) {
        errors.push(result.error.message);
      }

      return {
        isValid: result.valid,
        errors,
        warnings, // Server doesn't return warnings yet, but keep for future compatibility
        stepCount: steps.length,
        validatedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Don't show toast for validation errors - let the parent handle it
      throw error;
    }
  });
}
