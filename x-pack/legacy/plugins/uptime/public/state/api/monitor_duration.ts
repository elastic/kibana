/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseParams } from './types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

export const fetchMonitorDuration = async ({ monitorId, dateStart, dateEnd }: BaseParams) => {
  const queryParams = {
    monitorId,
    dateStart,
    dateEnd,
  };

  return await apiService.get(API_URLS.MONITOR_DURATION, queryParams);
};
