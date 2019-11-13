/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { FetchRulesResponse } from './types';

/**
 * Fetches all rules from the Detection Engine API
 *
 * @param kbnVersion current Kibana Version to use for headers
 */
export const fetchRules = async ({
  kbnVersion,
}: {
  kbnVersion: string;
}): Promise<FetchRulesResponse> => {
  const response = await fetch(`${chrome.getBasePath()}/api/siem/signals/_find`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'kbn-system-api': 'true',
      'content-type': 'application/json',
      'kbn-version': kbnVersion,
      'kbn-xsrf': kbnVersion,
    },
  });
  // await throwIfNotOk(response);
  return response.json();
};
