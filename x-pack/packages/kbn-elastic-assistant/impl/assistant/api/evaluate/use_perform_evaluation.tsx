/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { postEvaluation } from './evaluate';

const PERFORM_EVALUATION_MUTATION_KEY = ['elastic-assistant', 'perform-evaluation'];

export interface UsePerformEvaluationParams {
  http: HttpSetup;
  toasts?: IToasts;
}

export interface PerformEvaluationParams {
  agents: string[];
  dataset: string | undefined;
  datasetName: string | undefined;
  evalModel: string[];
  evalPrompt: string;
  evaluationType: string[];
  models: string[];
  outputIndex: string;
  projectName: string | undefined;
  runName: string | undefined;
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
    (evalParams?: PerformEvaluationParams | void) => {
      // Optional params workaround: see: https://github.com/TanStack/query/issues/1077#issuecomment-1431247266
      return postEvaluation({ http, evalParams: evalParams ?? undefined });
    },
    {
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
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
