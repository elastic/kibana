/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApiPath } from '../../lib/helper';

interface APIParams {
  basePath: string;
}

export const fetchIndexPattern = async ({ basePath }: APIParams) => {
  const url = getApiPath(`/api/uptime/index_pattern`, basePath);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return await response.json();
};
