/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalHit } from '../../types';
import { Logger } from '../../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerting/server/types';
import { SignalSourceHit, SignalSearchResponse, SignalAlertParams } from './types';

// format scroll search result for signals index.
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
  const firstResult = await service.callCluster('bulk', {
    refresh: true,
    body: bulkBody,
  });
  if (firstResult.errors) {
    logger.error(`[-] bulkResponse had errors: ${JSON.stringify(firstResult.errors, null, 2)}}`);
    return false;
  }
  return true;
};

// Given a scroll id, grab the next set of documents
export const singleScroll = async (
  scrollId: string | undefined,
  params: SignalAlertParams & { scrollLock?: number }, // TODO: Finish plumbing the scrollLock all the way to the REST endpoint if this algorithm continues to use it.
  service: AlertServices,
  logger: Logger
): Promise<SignalSearchResponse> => {
  const scroll = params.scrollLock ? params.scrollLock : '1m';
  try {
    const nextScrollResult = await service.callCluster('scroll', {
      scroll,
      scrollId,
    });
    return nextScrollResult;
  } catch (exc) {
    logger.error(`[-] nextScroll threw an error ${exc}`);
    throw exc;
  }
};

// scroll through documents and re-index using bulk endpoint.
export const scrollAndBulkIndex = async (
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
  let newScrollId = someResult._scroll_id;
  while (true) {
    try {
      const scrollResult = await singleScroll(newScrollId, params, service, logger);
      newScrollId = scrollResult._scroll_id;
      if (scrollResult.hits.hits.length === 0) {
        logger.info('[+] Finished indexing signals');
        return true;
      }
      const bulkSuccess = await singleBulkIndex(scrollResult, params, service, logger);
      if (!bulkSuccess) {
        logger.error('[-] bulk index failed');
      }
    } catch (exc) {
      logger.error('[-] scroll and bulk threw an error');
      return false;
    }
  }
};
