/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryParams } from '../actions/types';
import { Ping } from '../../../common/graphql/types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

export const fetchMonitorStatus = async ({
  monitorId,
  dateStart,
  dateEnd,
}: QueryParams): Promise<Ping> => {
  const queryParams = {
    monitorId,
    dateStart,
    dateEnd,
  };

  return await apiService.get(API_URLS.MONITOR_STATUS, queryParams);
};
