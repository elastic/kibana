/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { transactionChartsRoute } from './transaction_charts_route';
import { transactionGroupListRoute } from './transaction_group_list_route';
import { transactionDistributionRoute } from './transaction_distribution_route';
import { transactionBreakdownRoute } from './transaction_breakdown_route';

export function initTransactionGroupsApi(core: InternalCoreSetup) {
  const { server } = core.http;

  server.route(transactionGroupListRoute);
  server.route(transactionChartsRoute);
  server.route(transactionDistributionRoute);
  server.route(transactionBreakdownRoute);
}
