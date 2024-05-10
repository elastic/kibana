/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import {
  API_VERSIONS,
  GetEvaluateResponse,
  PostEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { PerformEvaluationParams } from './use_perform_evaluation';

export interface PostEvaluationParams {
  http: HttpSetup;
  evalParams?: PerformEvaluationParams;
  signal?: AbortSignal | undefined;
}

/**
 * API call for evaluating models.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.evalParams] - Params necessary for evaluation
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<PostEvaluateResponse | IHttpFetchError>}
 */
export const postEvaluation = async ({
  http,
  evalParams,
  signal,
}: PostEvaluationParams): Promise<PostEvaluateResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/evaluate`;
    const query = {
      agents: evalParams?.agents.sort()?.join(','),
      datasetName: evalParams?.datasetName,
      evaluationType: evalParams?.evaluationType.sort()?.join(','),
      evalModel: evalParams?.evalModel.sort()?.join(','),
      outputIndex: evalParams?.outputIndex,
      models: evalParams?.models.sort()?.join(','),
      projectName: evalParams?.projectName,
      runName: evalParams?.runName,
    };

    return await http.post<PostEvaluateResponse>(path, {
      body: JSON.stringify({
        dataset: JSON.parse(evalParams?.dataset ?? '[]'),
        evalPrompt: evalParams?.evalPrompt ?? '',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      query,
      signal,
      version: API_VERSIONS.internal.v1,
    });
  } catch (error) {
    return error as IHttpFetchError;
  }
};

export interface GetEvaluationParams {
  http: HttpSetup;
  signal?: AbortSignal | undefined;
}

/**
 * API call for fetching evaluation data.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<GetEvaluateResponse | IHttpFetchError>}
 */
export const getEvaluation = async ({
  http,
  signal,
}: GetEvaluationParams): Promise<GetEvaluateResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/evaluate`;

    return await http.get<GetEvaluateResponse>(path, {
      signal,
      version: API_VERSIONS.internal.v1,
    });
  } catch (error) {
    return error as IHttpFetchError;
  }
};
