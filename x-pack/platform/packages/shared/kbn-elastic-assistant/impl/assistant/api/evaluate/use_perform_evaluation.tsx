/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { PostEvaluateRequestBodyInput } from '@kbn/elastic-assistant-common';
import { postEvaluation } from './evaluate';

const PERFORM_EVALUATION_MUTATION_KEY = ['elastic-assistant', 'perform-evaluation'];

export interface UsePerformEvaluationParams {
  http: HttpSetup;
  toasts?: IToasts;
}

export interface ResponseError {
  statusCode: number;
  success: boolean;
  message: {
    error: string;
  };
}

/**
 * Hook for performing model evaluations
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useMutation} mutation hook for setting up the Knowledge Base
 */
export const usePerformEvaluation = ({ http, toasts }: UsePerformEvaluationParams) => {
  return useMutation(
    PERFORM_EVALUATION_MUTATION_KEY,
    (evalParams: PostEvaluateRequestBodyInput) => {
      return postEvaluation({ http, evalParams });
    },
    {
      onError: (error: IHttpFetchError<ResponseError>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error?.body?.message?.error ? new Error(error.body.message.error) : error,
            {
              title: i18n.translate('xpack.elasticAssistant.evaluation.evaluationError', {
                defaultMessage: 'Error performing evaluation...',
              }),
            }
          );
        }
      },
    }
  );
};
