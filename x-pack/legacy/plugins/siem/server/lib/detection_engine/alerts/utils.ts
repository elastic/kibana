/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import { pickBy } from 'lodash/fp';
import { SignalHit, Signal } from '../../types';
import { Logger } from '../../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerting/server/types';
import {
  SignalSourceHit,
  SignalSearchResponse,
  BulkResponse,
  RuleTypeParams,
  OutputRuleAlertRest,
} from './types';
import { buildEventsSearchQuery } from './build_events_query';

interface BuildRuleParams {
  ruleParams: RuleTypeParams;
  name: string;
  id: string;
  enabled: boolean;
  createdBy: string;
  updatedBy: string;
  interval: string;
}

export const buildRule = ({
  ruleParams,
  name,
  id,
  enabled,
  createdBy,
  updatedBy,
  interval,
}: BuildRuleParams): Partial<OutputRuleAlertRest> => {
  return pickBy<OutputRuleAlertRest>((value: unknown) => value != null, {
    id,
    rule_id: ruleParams.ruleId,
    false_positives: ruleParams.falsePositives,
    saved_id: ruleParams.savedId,
    meta: ruleParams.meta,
    max_signals: ruleParams.maxSignals,
    risk_score: ruleParams.riskScore,
    output_index: ruleParams.outputIndex,
    description: ruleParams.description,
    filter: ruleParams.filter,
    from: ruleParams.from,
    immutable: ruleParams.immutable,
    index: ruleParams.index,
    interval,
    language: ruleParams.language,
    name,
    query: ruleParams.query,
    references: ruleParams.references,
    severity: ruleParams.severity,
    tags: ruleParams.tags,
    type: ruleParams.type,
    to: ruleParams.to,
    enabled,
    filters: ruleParams.filters,
    created_by: createdBy,
    updated_by: updatedBy,
    threats: ruleParams.threats,
  });
};

export const buildSignal = (doc: SignalSourceHit, rule: Partial<OutputRuleAlertRest>): Signal => {
  const signal: Signal = {
    parent: {
      id: doc._id,
      type: 'event',
      index: doc._index,
      depth: 1,
    },
    original_time: doc._source['@timestamp'],
    status: 'open',
    rule,
  };
  if (doc._source.event != null) {
    return { ...signal, original_event: doc._source.event };
  }
  return signal;
};

interface BuildBulkBodyParams {
  doc: SignalSourceHit;
  ruleParams: RuleTypeParams;
  id: string;
  name: string;
  createdBy: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
}

export const buildEventTypeSignal = (doc: SignalSourceHit): object => {
  if (doc._source.event != null && doc._source.event instanceof Object) {
    return { ...doc._source.event, kind: 'signal' };
  } else {
    return { kind: 'signal' };
  }
};

// format search_after result for signals index.
export const buildBulkBody = ({
  doc,
  ruleParams,
  id,
  name,
  createdBy,
  updatedBy,
  interval,
  enabled,
}: BuildBulkBodyParams): SignalHit => {
  const rule = buildRule({
    ruleParams,
    id,
    name,
    enabled,
    createdBy,
    updatedBy,
    interval,
  });
  const signal = buildSignal(doc, rule);
  const event = buildEventTypeSignal(doc);
  const signalHit: SignalHit = {
    ...doc._source,
    '@timestamp': new Date().toISOString(),
    event,
    signal,
  };
  return signalHit;
};

interface SingleBulkCreateParams {
  someResult: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  id: string;
  signalsIndex: string;
  name: string;
  createdBy: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
}

export const generateId = (
  docIndex: string,
  docId: string,
  version: string,
  ruleId: string
): string =>
  createHash('sha256')
    .update(docIndex.concat(docId, version, ruleId))
    .digest('hex');

// Bulk Index documents.
export const singleBulkCreate = async ({
  someResult,
  ruleParams,
  services,
  logger,
  id,
  signalsIndex,
  name,
  createdBy,
  updatedBy,
  interval,
  enabled,
}: SingleBulkCreateParams): Promise<boolean> => {
  if (someResult.hits.hits.length === 0) {
    return true;
  }
  // index documents after creating an ID based on the
  // source documents' originating index, and the original
  // document _id. This will allow two documents from two
  // different indexes with the same ID to be
  // indexed, and prevents us from creating any updates
  // to the documents once inserted into the signals index,
  // while preventing duplicates from being added to the
  // signals index if rules are re-run over the same time
  // span. Also allow for versioning.
  const bulkBody = someResult.hits.hits.flatMap(doc => [
    {
      create: {
        _index: signalsIndex,
        _id: generateId(
          doc._index,
          doc._id,
          doc._version ? doc._version.toString() : '',
          ruleParams.ruleId ?? ''
        ),
      },
    },
    buildBulkBody({ doc, ruleParams, id, name, createdBy, updatedBy, interval, enabled }),
  ]);
  const time1 = performance.now();
  const firstResult: BulkResponse = await services.callCluster('bulk', {
    index: signalsIndex,
    refresh: false,
    body: bulkBody,
  });
  const time2 = performance.now();
  logger.debug(`individual bulk process time took: ${time2 - time1} milliseconds`);
  logger.debug(`took property says bulk took: ${firstResult.took} milliseconds`);
  if (firstResult.errors) {
    // go through the response status errors and see what
    // types of errors they are, count them up, and log them.
    const errorCountMap = firstResult.items.reduce((acc: { [key: string]: number }, item) => {
      if (item.create.error) {
        const responseStatusKey = item.create.status.toString();
        acc[responseStatusKey] = acc[responseStatusKey] ? acc[responseStatusKey] + 1 : 1;
      }
      return acc;
    }, {});
    /*
     the logging output below should look like
     {'409': 55}
     which is read as "there were 55 counts of 409 errors returned from bulk create"
    */
    logger.error(
      `[-] bulkResponse had errors with response statuses:counts of...\n${JSON.stringify(
        errorCountMap,
        null,
        2
      )}`
    );
  }
  return true;
};

interface SingleSearchAfterParams {
  searchAfterSortId: string | undefined;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  pageSize: number;
}

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async ({
  searchAfterSortId,
  ruleParams,
  services,
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
      filter: ruleParams.filter,
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

interface SearchAfterAndBulkCreateParams {
  someResult: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  id: string;
  signalsIndex: string;
  name: string;
  createdBy: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  pageSize: number;
}

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  someResult,
  ruleParams,
  services,
  logger,
  id,
  signalsIndex,
  name,
  createdBy,
  updatedBy,
  interval,
  enabled,
  pageSize,
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
    createdBy,
    updatedBy,
    interval,
    enabled,
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
        createdBy,
        updatedBy,
        interval,
        enabled,
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
