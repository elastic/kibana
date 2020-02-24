/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApiPath } from '../../lib/helper';

interface APIParams {
  basePath: string;
}

export const fetchMonitorDuration = async ({
  basePath,
  monitorId,
  dateStart,
  dateEnd,
}: APIParams) => {
  const url = getApiPath(`/api/uptime/monitor/duration`, basePath);

  const params = {
    monitorId,
    dateStart,
    dateEnd,
  };
  const urlParams = new URLSearchParams(params).toString();

  const response = await fetch(`${url}?${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return await response.json();
};
