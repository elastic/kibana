/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { throwIfNotOk } from '../../../hooks/api/api';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../common/constants';
import { QuerySignals, SignalSearchResponse } from './types';

/**
 * Fetch Signals by providing a query
 *
 * @param query Rule ID's (not rule_id)
 * @param kbnVersion current Kibana Version to use for headers
 */
export const fetchQuerySignals = async <Hit, Aggregations>({
  query,
  kbnVersion,
  signal,
}: QuerySignals): Promise<SignalSearchResponse<Hit, Aggregations>> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_QUERY_SIGNALS_URL}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-version': kbnVersion,
      'kbn-xsrf': kbnVersion,
    },
    body: query,
    signal,
  });
  await throwIfNotOk(response);
  const signals = await response.json();
  return signals;
};
