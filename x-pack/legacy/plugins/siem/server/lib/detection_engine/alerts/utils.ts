/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { performance } from 'perf_hooks';
import { SignalHit } from '../../types';
import { Logger } from '../../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerting/server/types';
import { SignalSourceHit, SignalSearchResponse, SignalAlertParams, BulkResponse } from './types';
import { buildEventsSearchQuery } from './build_events_query';

// format search_after result for signals index.
export const buildBulkBody = (doc: SignalSourceHit, signalParams: SignalAlertParams): SignalHit => {
  return {
    ...doc._source,
    signal: {
      '@timestamp': new Date().toISOString(),
      rule_revision: 1,
      rule_id: signalParams.id,
      rule_type: signalParams.type,
      parent: {
        id: doc._id,
        type: 'event',
        index: doc._index,
        depth: 1,
      },
      name: signalParams.name,
      severity: signalParams.severity,
      description: signalParams.description,
      original_time: doc._source['@timestamp'],
      index_patterns: signalParams.index,
      references: signalParams.references,
    },
  };
};

// Bulk Index documents.
export const singleBulkIndex = async (
  sr: SignalSearchResponse,
  params: SignalAlertParams,
  service: AlertServices,
  logger: Logger
): Promise<boolean> => {
  if (sr.hits.hits.length === 0) {
    logger.warn('First search result yielded 0 documents');
    return false;
  }
  const bulkBody = sr.hits.hits.flatMap(doc => [
    {
      index: {
        _index: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
        _id: doc._id,
      },
    },
    buildBulkBody(doc, params),
  ]);
  const time1 = performance.now();
  const firstResult: BulkResponse = await service.callCluster('bulk', {
    index: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
    refresh: false,
    body: bulkBody,
  });
  const time2 = performance.now();
  logger.info(`individual bulk process time took: ${time2 - time1} milliseconds`);
  logger.info(`took property says bulk took: ${firstResult.took} milliseconds`);
  if (firstResult.errors) {
    logger.error(`[-] bulkResponse had errors: ${JSON.stringify(firstResult.errors, null, 2)}}`);
    return false;
  }
  return true;
};

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async (
  searchAfterSortId: string | undefined,
  params: SignalAlertParams,
  service: AlertServices,
  logger: Logger
): Promise<SignalSearchResponse> => {
  if (searchAfterSortId == null) {
    throw Error('Attempted to search after with empty sort id');
  }
  try {
    const searchAfterQuery = buildEventsSearchQuery({
      index: params.index,
      from: params.from,
      to: params.to,
      filter: params.filter,
      size: params.size ? params.size : 1000,
      searchAfterSortId,
    });
    const nextSearchAfterResult = await service.callCluster('search', searchAfterQuery);
    return nextSearchAfterResult;
  } catch (exc) {
    logger.error(`[-] nextSearchAfter threw an error ${exc}`);
    throw exc;
  }
};

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkIndex = async (
  someResult: SignalSearchResponse,
  params: SignalAlertParams,
  service: AlertServices,
  logger: Logger
): Promise<boolean> => {
  logger.info('[+] starting bulk insertion');
  const firstBulkIndexSuccess = await singleBulkIndex(someResult, params, service, logger);
  if (!firstBulkIndexSuccess) {
    logger.warn('First bulk index was unsuccessful');
    return false;
  }

  const totalHits =
    typeof someResult.hits.total === 'number' ? someResult.hits.total : someResult.hits.total.value;
  let size = someResult.hits.hits.length - 1;
  logger.info(`first size: ${size}`);
  let sortIds = someResult.hits.hits[0].sort;
  if (sortIds == null && totalHits > 0) {
    logger.warn('sortIds was empty on first search but expected more ');
    return false;
  } else if (sortIds == null && totalHits === 0) {
    return true;
  }
  let sortId;
  if (sortIds != null) {
    sortId = sortIds[0];
  }
  while (size < totalHits) {
    // utilize track_total_hits instead of true
    try {
      logger.info(`sortIds: ${sortIds}`);
      const searchAfterResult: SignalSearchResponse = await singleSearchAfter(
        sortId,
        params,
        service,
        logger
      );
      size += searchAfterResult.hits.hits.length - 1;
      logger.info(`size: ${size}`);
      sortIds = searchAfterResult.hits.hits[0].sort;
      if (sortIds == null) {
        logger.warn('sortIds was empty search');
        return false;
      }
      sortId = sortIds[0];
      logger.info('next bulk index');
      const bulkSuccess = await singleBulkIndex(searchAfterResult, params, service, logger);
      logger.info('finished next bulk index');
      if (!bulkSuccess) {
        logger.error('[-] bulk index failed');
      }
    } catch (exc) {
      logger.error(`[-] search_after and bulk threw an error ${exc}`);
      return false;
    }
  }
  logger.info(`[+] completed bulk index of ${totalHits}`);
  return true;
};
