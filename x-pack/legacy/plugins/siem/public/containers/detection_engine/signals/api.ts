/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../lib/kibana';
import { throwIfNotOk } from '../../../hooks/api/api';
import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_INDEX_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
} from '../../../../common/constants';
import {
  BasicSignals,
  PostSignalError,
  Privilege,
  QuerySignals,
  SignalIndexError,
  SignalSearchResponse,
  SignalsIndex,
  UpdateSignalStatusProps,
} from './types';

/**
 * Fetch Signals by providing a query
 *
 * @param query String to match a dsl
 */
export const fetchQuerySignals = async <Hit, Aggregations>({
  query,
  signal,
}: QuerySignals): Promise<SignalSearchResponse<Hit, Aggregations>> => {
  const response = await KibanaServices.get().http.fetch<SignalSearchResponse<Hit, Aggregations>>(
    DETECTION_ENGINE_QUERY_SIGNALS_URL,
    {
      method: 'POST',
      body: JSON.stringify(query),
      asResponse: true,
      signal,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Update signal status by query
 *
 * @param query of signals to update
 * @param status to update to('open' / 'closed')
 * @param signal AbortSignal for cancelling request
 */
export const updateSignalStatus = async ({
  query,
  status,
  signal,
}: UpdateSignalStatusProps): Promise<unknown> => {
  const response = await KibanaServices.get().http.fetch(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
    method: 'POST',
    body: JSON.stringify({ status, ...query }),
    asResponse: true,
    signal,
  });

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Fetch Signal Index
 *
 * @param signal AbortSignal for cancelling request
 */
export const getSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex> => {
  try {
    return await KibanaServices.get().http.fetch<SignalsIndex>(DETECTION_ENGINE_INDEX_URL, {
      method: 'GET',
      signal,
    });
  } catch (e) {
    if (e.body) {
      throw new SignalIndexError(e.body);
    }
    throw e;
  }
};

/**
 * Get User Privileges
 *
 * @param signal AbortSignal for cancelling request
 */
export const getUserPrivilege = async ({ signal }: BasicSignals): Promise<Privilege> => {
  const response = await KibanaServices.get().http.fetch<Privilege>(
    DETECTION_ENGINE_PRIVILEGES_URL,
    {
      method: 'GET',
      signal,
      asResponse: true,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Create Signal Index if needed it
 *
 * @param signal AbortSignal for cancelling request
 */
export const createSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex> => {
  try {
    return await KibanaServices.get().http.fetch<SignalsIndex>(DETECTION_ENGINE_INDEX_URL, {
      method: 'POST',
      signal,
    });
  } catch (e) {
    if (e.body) {
      throw new PostSignalError(e.body);
    }
    throw e;
  }
};
