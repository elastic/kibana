/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import { transactionGroupsFetcher, Options } from './fetcher';
import { transactionGroupsTransformer } from './transform';
import { PromiseReturnType } from '../../../typings/common';

export type TransactionGroupListAPIResponse = PromiseReturnType<
  typeof getTransactionGroupList
>;
export async function getTransactionGroupList(
  options: Options,
  setup: Setup & SetupTimeRange & SetupUIFilters
) {
  const { start, end } = setup;
  const response = await transactionGroupsFetcher(options, setup);
  return transactionGroupsTransformer({
    response,
    start,
    end
  });
}
