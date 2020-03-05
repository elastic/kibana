/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringify } from 'querystring';

import { getApiPath } from '../../lib/helper';
import { BaseParams } from './types';

export const fetchMonitorDuration = async ({
  basePath,
  monitorId,
  dateStart,
  dateEnd,
}: BaseParams) => {
  const url = getApiPath(`/api/uptime/monitor/duration`, basePath);

  const params = {
    monitorId,
    dateStart,
    dateEnd,
  };
  const urlParams = stringify(params);

  const response = await fetch(`${url}?${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return await response.json();
};
