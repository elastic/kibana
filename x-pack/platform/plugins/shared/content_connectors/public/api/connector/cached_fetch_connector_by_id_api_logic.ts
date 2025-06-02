/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { isEqual } from 'lodash';

import type { Connector } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import {
  FetchConnectorByIdApiLogic,
  FetchConnectorByIdApiLogicArgs,
  FetchConnectorByIdApiLogicResponse,
} from './fetch_connector_by_id_logic';
import { Actions } from '../api_logic/create_api_logic';
import { Status } from '../../../common/types/api';

const FETCH_CONNECTOR_POLLING_DURATION = 5000; // 5 seconds
const FETCH_CONNECTOR_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds

export interface CachedFetchConnectorByIdApiLogicActions {
  apiError: Actions<FetchConnectorByIdApiLogicArgs, FetchConnectorByIdApiLogicResponse>['apiError'];
  apiReset: Actions<FetchConnectorByIdApiLogicArgs, FetchConnectorByIdApiLogicResponse>['apiReset'];
  apiSuccess: Actions<
    FetchConnectorByIdApiLogicArgs,
    FetchConnectorByIdApiLogicResponse
  >['apiSuccess'];
  clearPollTimeout(): void;
  createPollTimeout(duration: number): { duration: number };
  makeRequest: Actions<
    FetchConnectorByIdApiLogicArgs,
    FetchConnectorByIdApiLogicResponse
  >['makeRequest'];
  setTimeoutId(id: NodeJS.Timeout): { id: NodeJS.Timeout };
  startPolling(connectorId: string): { connectorId: string };
  stopPolling(): void;
}
export interface CachedFetchConnectorByIdApiLogicValues {
  connectorData: Connector | null;
  connectorId: string;
  fetchConnectorByIdApiData: FetchConnectorByIdApiLogicResponse;
  isInitialLoading: boolean;
  isLoading: boolean;
  pollTimeoutId: NodeJS.Timeout | null;
  status: Status;
  http?: HttpSetup;
}

export const CachedFetchConnectorByIdApiLogic = kea<
  MakeLogicType<CachedFetchConnectorByIdApiLogicValues, CachedFetchConnectorByIdApiLogicActions>
>({
  key: (props) => props.http,
  actions: {
    clearPollTimeout: true,
    createPollTimeout: (duration) => ({ duration }),
    setTimeoutId: (id) => ({ id }),
    startPolling: (connectorId) => ({ connectorId }),
    stopPolling: true,
  },
  connect: {
    actions: [FetchConnectorByIdApiLogic, ['apiSuccess', 'apiError', 'apiReset', 'makeRequest']],
    values: [FetchConnectorByIdApiLogic, ['data as fetchConnectorByIdApiData', 'status']],
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
        actions.createPollTimeout(FETCH_CONNECTOR_POLLING_DURATION_ON_FAILURE);
      }
    },
    apiSuccess: () => {
      if (values.pollTimeoutId) {
        actions.createPollTimeout(FETCH_CONNECTOR_POLLING_DURATION);
      }
    },
    createPollTimeout: ({ duration }) => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        actions.makeRequest({ connectorId: values.connectorId, http: props.http });
      }, duration);
      actions.setTimeoutId(timeoutId);
    },
    startPolling: ({ connectorId }) => {
      // Recurring polls are created by apiSuccess and apiError, depending on pollTimeoutId
      if (values.pollTimeoutId) {
        if (connectorId === values.connectorId) return;
        clearTimeout(values.pollTimeoutId);
      }
      actions.makeRequest({ connectorId, http: props.http });

      actions.createPollTimeout(FETCH_CONNECTOR_POLLING_DURATION);
    },
    stopPolling: () => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }
      actions.clearPollTimeout();
    },
  }),
  path: ['content_connectors', 'content', 'api', 'fetch_connector_by_id_api_wrapper'],
  reducers: {
    connectorData: [
      null,
      {
        apiReset: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        apiSuccess: (currentState, newConnectorData) => {
          return isEqual(currentState, newConnectorData.connector)
            ? currentState
            : newConnectorData.connector ?? null;
        },
      },
    ],
    connectorId: [
      '',
      {
        apiReset: () => '',
        // @ts-expect-error upgrade typescript v5.1.6
        startPolling: (_, { connectorId }) => connectorId,
      },
    ],
    pollTimeoutId: [
      null,
      {
        clearPollTimeout: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        setTimeoutId: (_, { id }) => id,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isInitialLoading: [
      () => [selectors.status, selectors.connectorData],
      (
        status: CachedFetchConnectorByIdApiLogicValues['status'],
        connectorData: CachedFetchConnectorByIdApiLogicValues['connectorData']
      ) => {
        return status === Status.IDLE || (connectorData === null && status === Status.LOADING);
      },
    ],
  }),
});
