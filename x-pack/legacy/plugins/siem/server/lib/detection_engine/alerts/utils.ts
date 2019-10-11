/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse, SearchHit, SignalHit } from '../../types';
import { Logger } from '../../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerting/server/types';

// format scroll search result for signals index.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildBulkBody = (doc: SearchHit, signalParams: Record<string, any>): SignalHit => {
  const indexPatterns = signalParams.index.map((element: string) => `"${element}"`).join(',');
  const refs = signalParams.references.map((element: string) => `"${element}"`).join(',');
  return {
    ...doc._source,
    signal: {
      rule_revision: 1,
      rule_id: signalParams.id,
      rule_type: signalParams.type,
      parent: {
        id: doc._id,
        type: 'event',
        depth: 1,
      },
      name: signalParams.name,
      severity: signalParams.severity,
      description: signalParams.description,
      time_detected: Date.now(),
      index_patterns: indexPatterns,
      references: refs,
    },
  };
};

// Bulk Index documents.
export const singleBulkIndex = async (
  sr: SearchResponse<object>,
  params: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  service: AlertServices,
  logger: Logger
): Promise<boolean> => {
  if (sr.hits.hits.length === 0) {
    logger.warn('First search result yielded 0 documents');
    return false;
  }
  const bulkBody = sr.hits.hits.flatMap((doc: SearchHit) => [
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
  params: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  service: AlertServices,
  logger: Logger
): Promise<SearchResponse<object>> => {
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
  someResult: SearchResponse<object>,
  params: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
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
