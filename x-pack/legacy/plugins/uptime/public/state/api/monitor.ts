/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { MonitorDetailsRequest, MonitorDetailsState } from '../actions/monitor';
import { getApiPath } from '../../lib/helper';
import { UptimeSettingsContext } from '../../contexts';

export const fetchMonitorDetails = async (
  data: MonitorDetailsRequest
): Promise<MonitorDetailsState> => {
  const { basePath } = useContext(UptimeSettingsContext);
  const { monitorId, checkGroup } = data;

  const url = getApiPath(
    `/api/uptime/monitor/details?monitorId=${monitorId}&checkGroup=${checkGroup}`,
    basePath
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return response.json();
};
