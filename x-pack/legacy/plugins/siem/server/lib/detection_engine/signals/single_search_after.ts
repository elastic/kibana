/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleTypeParams } from '../types';
import { AlertServices } from '../../../../../alerting/server/types';
import { Logger } from '../../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';
import { buildEventsSearchQuery } from './build_events_query';

interface SingleSearchAfterParams {
  searchAfterSortId: string | undefined;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  pageSize: number;
  filter: unknown;
}

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async ({
  searchAfterSortId,
  ruleParams,
  services,
  filter,
  logger,
  pageSize,
}: SingleSearchAfterParams): Promise<SignalSearchResponse> => {
  if (searchAfterSortId == null) {
    throw Error('Attempted to search after with empty sort id');
  }
  try {
    const searchAfterQuery = buildEventsSearchQuery({
      index: ruleParams.index,
      from: ruleParams.from,
      to: ruleParams.to,
      filter,
      size: pageSize,
      searchAfterSortId,
    });
    const nextSearchAfterResult: SignalSearchResponse = await services.callCluster(
      'search',
      searchAfterQuery
    );
    return nextSearchAfterResult;
  } catch (exc) {
    logger.error(`[-] nextSearchAfter threw an error ${exc}`);
    throw exc;
  }
};
