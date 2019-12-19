/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { UpdateSignalStatusProps } from './types';
import { throwIfNotOk } from '../../../hooks/api/api';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../common/constants';

/**
 * Update signal status by query
 *
 * @param query of signals to update
 * @param status to update to ('open' / 'closed')
 * @param kbnVersion current Kibana Version to use for headers
 * @param signal to cancel request
 */
export const updateSignalStatus = async ({
  query,
  status,
  kbnVersion,
  signal,
}: UpdateSignalStatusProps): Promise<unknown> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_SIGNALS_STATUS_URL}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-version': kbnVersion,
      'kbn-xsrf': kbnVersion,
    },
    body: JSON.stringify({ status, ...query }),
    signal,
  });

  await throwIfNotOk(response);
  return response.json();
};
