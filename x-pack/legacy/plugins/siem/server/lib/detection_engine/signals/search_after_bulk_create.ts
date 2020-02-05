/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleTypeParams } from '../types';
import { AlertServices } from '../../../../../alerting/server/types';
import { Logger } from '../../../../../../../../src/core/server';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { SignalSearchResponse } from './types';

interface SearchAfterAndBulkCreateParams {
  someResult: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  id: string;
  signalsIndex: string;
  name: string;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  interval: string;
  enabled: boolean;
  pageSize: number;
  filter: unknown;
  tags: string[];
}

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  someResult,
  ruleParams,
  services,
  logger,
  id,
  signalsIndex,
  filter,
  name,
  createdAt,
  createdBy,
  updatedBy,
  updatedAt,
  interval,
  enabled,
  pageSize,
  tags,
}: SearchAfterAndBulkCreateParams): Promise<boolean> => {
  if (someResult.hits.hits.length === 0) {
    return true;
  }

  logger.debug('[+] starting bulk insertion');
  await singleBulkCreate({
    someResult,
    ruleParams,
    services,
    logger,
    id,
    signalsIndex,
    name,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    interval,
    enabled,
    tags,
  });
  const totalHits =
    typeof someResult.hits.total === 'number' ? someResult.hits.total : someResult.hits.total.value;
  // maxTotalHitsSize represents the total number of docs to
  // query for, no matter the size of each individual page of search results.
  // If the total number of hits for the overall search result is greater than
  // maxSignals, default to requesting a total of maxSignals, otherwise use the
  // totalHits in the response from the searchAfter query.
  const maxTotalHitsSize = totalHits >= ruleParams.maxSignals ? ruleParams.maxSignals : totalHits;

  // number of docs in the current search result
  let hitsSize = someResult.hits.hits.length;
  logger.debug(`first size: ${hitsSize}`);
  let sortIds = someResult.hits.hits[0].sort;
  if (sortIds == null && totalHits > 0) {
    logger.error('sortIds was empty on first search but expected more');
    return false;
  } else if (sortIds == null && totalHits === 0) {
    return true;
  }
  let sortId;
  if (sortIds != null) {
    sortId = sortIds[0];
  }
  while (hitsSize < maxTotalHitsSize && hitsSize !== 0) {
    try {
      logger.debug(`sortIds: ${sortIds}`);
      const searchAfterResult: SignalSearchResponse = await singleSearchAfter({
        searchAfterSortId: sortId,
        ruleParams,
        services,
        logger,
        filter,
        pageSize, // maximum number of docs to receive per search result.
      });
      if (searchAfterResult.hits.hits.length === 0) {
        return true;
      }
      hitsSize += searchAfterResult.hits.hits.length;
      logger.debug(`size adjusted: ${hitsSize}`);
      sortIds = searchAfterResult.hits.hits[0].sort;
      if (sortIds == null) {
        logger.debug('sortIds was empty on search');
        return true; // no more search results
      }
      sortId = sortIds[0];
      logger.debug('next bulk index');
      await singleBulkCreate({
        someResult: searchAfterResult,
        ruleParams,
        services,
        logger,
        id,
        signalsIndex,
        name,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        interval,
        enabled,
        tags,
      });
      logger.debug('finished next bulk index');
    } catch (exc) {
      logger.error(`[-] search_after and bulk threw an error ${exc}`);
      return false;
    }
  }
  logger.debug(`[+] completed bulk index of ${maxTotalHitsSize}`);
  return true;
};
