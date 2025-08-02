/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { isEqual } from 'lodash';

import type { ElasticsearchIndexWithIngestion } from '@kbn/search-connectors';
import { HttpSetup } from '@kbn/core/public';
import { IndexNameLogic } from '../../components/search_index/index_name_logic';

import {
  FetchIndexApiParams,
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from './fetch_index_api_logic';
import { Actions } from '../api_logic/create_api_logic';
import { Status } from '../../../common/types/api';

const FETCH_INDEX_POLLING_DURATION = 5000; // 5 seconds
const FETCH_INDEX_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds

export interface CachedFetchIndexApiLogicActions {
  apiError: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiError'];
  apiReset: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiReset'];
  apiSuccess: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiSuccess'];
  clearPollTimeout(): void;
  createPollTimeout(duration: number): { duration: number };
  makeRequest: Actions<FetchIndexApiParams, FetchIndexApiResponse>['makeRequest'];
  setTimeoutId(id: NodeJS.Timeout): { id: NodeJS.Timeout };
  startPolling(indexName: string): { indexName: string };
  stopPolling(): void;
}
export interface CachedFetchIndexApiLogicValues {
  fetchIndexApiData: FetchIndexApiResponse;
  indexData: ElasticsearchIndexWithIngestion | null;
  indexName: string;
  isInitialLoading: boolean;
  isLoading: boolean;
  pollTimeoutId: NodeJS.Timeout | null;
  status: Status;
}

export interface CachedFetchIndexApiLogicProps {
  http?: HttpSetup;
}
export const CachedFetchIndexApiLogic = kea<
  MakeLogicType<
    CachedFetchIndexApiLogicValues,
    CachedFetchIndexApiLogicActions,
    CachedFetchIndexApiLogicProps
  >
>({
  key: (props) => props.http,
  actions: {
    clearPollTimeout: true,
    createPollTimeout: (duration) => ({ duration }),
    setTimeoutId: (id) => ({ id }),
    startPolling: (indexName) => ({ indexName }),
    stopPolling: true,
  },
  connect: {
    actions: [FetchIndexApiLogic, ['apiSuccess', 'apiError', 'apiReset', 'makeRequest']],
    values: [
      FetchIndexApiLogic,
      ['data as fetchIndexApiData', 'status'],
      IndexNameLogic,
      ['indexName'],
    ],
  },
  events: ({ values }) => ({
    beforeUnmount: () => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }
    },
  }),
  listeners: ({ actions, values, props }) => ({
    apiError: () => {
      if (values.pollTimeoutId) {
        actions.createPollTimeout(FETCH_INDEX_POLLING_DURATION_ON_FAILURE);
      }
    },
    apiSuccess: () => {
      if (values.pollTimeoutId) {
        actions.createPollTimeout(FETCH_INDEX_POLLING_DURATION);
      }
    },
    createPollTimeout: ({ duration }) => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        actions.makeRequest({ indexName: values.indexName, http: props.http });
      }, duration);
      actions.setTimeoutId(timeoutId);
    },
    startPolling: ({ indexName }) => {
      // Recurring polls are created by apiSuccess and apiError, depending on pollTimeoutId
      if (values.pollTimeoutId) {
        if (indexName === values.indexName) return;
        clearTimeout(values.pollTimeoutId);
      }
      if (indexName) {
        actions.makeRequest({ indexName, http: props.http });

        actions.createPollTimeout(FETCH_INDEX_POLLING_DURATION);
      }
    },
    stopPolling: () => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }
      actions.clearPollTimeout();
    },
  }),
  path: ['content_connectors', 'content', 'api', 'fetch_index_api_wrapper'],
  reducers: {
    indexData: [
      null,
      {
        apiReset: () => null,
        apiSuccess: (currentState, newIndexData) => {
          return isEqual(currentState, newIndexData) ? currentState : newIndexData;
        },
      },
    ],
    pollTimeoutId: [
      null,
      {
        clearPollTimeout: () => null,
        setTimeoutId: (_, { id }) => id,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isInitialLoading: [
      () => [selectors.status, selectors.indexData],
      (
        status: CachedFetchIndexApiLogicValues['status'],
        indexData: CachedFetchIndexApiLogicValues['indexData']
      ) => {
        return status === Status.IDLE || (indexData === null && status === Status.LOADING);
      },
    ],
  }),
});
