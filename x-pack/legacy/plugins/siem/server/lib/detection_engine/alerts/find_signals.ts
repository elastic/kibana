/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIGNALS_ID } from '../../../../common/constants';
import { AlertsClient } from '../../../../../alerting/server/alerts_client';

export interface GetSignalParams {
  alertsClient: AlertsClient;
  perPage?: number;
  page?: number;
  sortField?: string;
  fields?: string[];
}

// TODO: Change this from a search to a filter once this ticket is solved:
// https://github.com/elastic/kibana/projects/26#card-27462236
export const findSignals = async ({ alertsClient, perPage, page, fields }: GetSignalParams) => {
  return alertsClient.find({
    options: {
      fields,
      page,
      perPage,
      searchFields: ['alertTypeId'],
      search: SIGNALS_ID,
    },
  });
};
