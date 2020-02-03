/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { throwIfNotOk } from '../../../hooks/api/api';
import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_INDEX_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
} from '../../../../common/constants';
import {
  QuerySignals,
  SignalSearchResponse,
  UpdateSignalStatusProps,
  SignalsIndex,
  SignalIndexError,
  Privilege,
  PostSignalError,
  BasicSignals,
} from './types';
import { parseJsonFromBody } from '../../../utils/api';

/**
 * Fetch Signals by providing a query
 *
 * @param query String to match a dsl
 * @param signal AbortSignal for cancelling request
 */
export const fetchQuerySignals = async <Hit, Aggregations>({
  query,
  signal,
}: QuerySignals): Promise<SignalSearchResponse<Hit, Aggregations>> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_QUERY_SIGNALS_URL}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    body: JSON.stringify(query),
    signal,
  });
  await throwIfNotOk(response);
  const signals = await response.json();
  return signals;
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
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_SIGNALS_STATUS_URL}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    body: JSON.stringify({ status, ...query }),
    signal,
  });

  await throwIfNotOk(response);
  return response.json();
};

/**
 * Fetch Signal Index
 *
 * @param signal AbortSignal for cancelling request
 */
export const getSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex | null> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_INDEX_URL}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    signal,
  });
  if (response.ok) {
    const signalIndex = await response.json();
    return signalIndex;
  }
  const error = await parseJsonFromBody(response);
  if (error != null) {
    throw new SignalIndexError(error);
  }
  return null;
};

/**
 * Get User Privileges
 *
 * @param signal AbortSignal for cancelling request
 */
export const getUserPrivilege = async ({ signal }: BasicSignals): Promise<Privilege | null> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_PRIVILEGES_URL}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    signal,
  });

  await throwIfNotOk(response);
  return response.json();
};

/**
 * Create Signal Index if needed it
 *
 * @param signal AbortSignal for cancelling request
 */
export const createSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex | null> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_INDEX_URL}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    signal,
  });
  if (response.ok) {
    const signalIndex = await response.json();
    return signalIndex;
  }
  const error = await parseJsonFromBody(response);
  if (error != null) {
    throw new PostSignalError(error);
  }
  return null;
};
