/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import {
  API_VERSIONS,
  GetDatasetsResponse,
  PostDatasetsResponse,
} from '@kbn/elastic-assistant-common';
import { AddToDatasetParams } from './use_add_to_dataset';

export interface PostEvaluationParams {
  http: HttpSetup;
  datasetParams: AddToDatasetParams;
  signal?: AbortSignal | undefined;
}

/**
 * API call for adding messages to a dataset.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.datasetParams] - Params necessary for updating a dataset
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<PostDatasetsResponse | IHttpFetchError>}
 */
export const postDatasets = async ({
  http,
  datasetParams,
  signal,
}: PostEvaluationParams): Promise<PostDatasetsResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/datasets`;
    const query = {
      datasetId: datasetParams.datasetId,
    };

    return await http.post<PostDatasetsResponse>(path, {
      body: JSON.stringify({
        dataset: datasetParams.dataset,
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

export interface GetDatasetsParams {
  http: HttpSetup;
  signal?: AbortSignal | undefined;
}

/**
 * API call for fetching datasets data.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<GetDatasetsResponse | IHttpFetchError>}
 */
export const getDatasets = async ({
  http,
  signal,
}: GetDatasetsParams): Promise<GetDatasetsResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/datasets`;

    return await http.get<GetDatasetsResponse>(path, {
      signal,
      version: API_VERSIONS.internal.v1,
    });
  } catch (error) {
    return error as IHttpFetchError;
  }
};
