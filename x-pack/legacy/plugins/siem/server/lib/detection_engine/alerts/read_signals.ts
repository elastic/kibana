/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from '../../../../../alerting/server/alerts_client';

export interface ReadSignalParams {
  alertsClient: AlertsClient;
  id: string;
}

// TODO: Change this from a search to a filter once this ticket is solved:
// https://github.com/elastic/kibana/projects/26#card-27462236
export const readSignals = async ({ alertsClient, id }: ReadSignalParams) => {
  return alertsClient.get({ id });
};
