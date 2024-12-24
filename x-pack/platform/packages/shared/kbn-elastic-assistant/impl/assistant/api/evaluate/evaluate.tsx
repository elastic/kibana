/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_EVALUATE_URL,
  GetEvaluateResponse,
  PostEvaluateRequestBodyInput,
  PostEvaluateResponse,
} from '@kbn/elastic-assistant-common';

export interface PostEvaluationParams {
  http: HttpSetup;
  evalParams: PostEvaluateRequestBodyInput;
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
}: PostEvaluationParams): Promise<PostEvaluateResponse> => {
  return http.post<PostEvaluateResponse>(ELASTIC_AI_ASSISTANT_EVALUATE_URL, {
    body: JSON.stringify(evalParams),
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    version: API_VERSIONS.internal.v1,
  });
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
    return await http.get<GetEvaluateResponse>(ELASTIC_AI_ASSISTANT_EVALUATE_URL, {
      signal,
      version: API_VERSIONS.internal.v1,
    });
  } catch (error) {
    return error as IHttpFetchError;
  }
};
