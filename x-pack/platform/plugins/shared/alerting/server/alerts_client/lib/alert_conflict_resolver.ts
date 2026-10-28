/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkRequest,
  BulkResponse,
  BulkResponseItem,
  BulkOperationContainer,
  BulkOperationType,
  MgetResponseItem,
} from '@elastic/elasticsearch/lib/api/types';

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import {
  ALERT_INSTANCE_ID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  ALERT_CASE_IDS,
} from '@kbn/rule-data-utils';

import { zip, get } from 'lodash';
import { sanitizeBulkErrorResponse } from '../..';
import { retryTransientEsErrors } from '../../lib/retry_transient_es_errors';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRYABLE_ITEM_STATUS_CODES = new Set([429, 503]);
const RETRYABLE_ITEM_ERROR_TYPES = new Set([
  'circuit_breaking_exception',
  'es_rejected_execution_exception',
]);

// these fields are the one's we'll refresh from the fresh mget'd docs
const REFRESH_FIELDS_ALWAYS = [ALERT_WORKFLOW_STATUS, ALERT_WORKFLOW_TAGS, ALERT_CASE_IDS];
const REFRESH_FIELDS_CONDITIONAL = [ALERT_STATUS];
export const REFRESH_FIELDS_ALL = [...REFRESH_FIELDS_ALWAYS, ...REFRESH_FIELDS_CONDITIONAL];

export interface ResolveAlertConflictsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  bulkRequest: BulkRequest<unknown, unknown>;
  bulkResponse: BulkResponse;
  ruleId: string;
  ruleName: string;
  ruleType: string;
}

export interface ResolveAlertConflictsResult {
  /** Conflicted or retryable alert writes that still failed after all retries. */
  unresolvedCount: number;
  /** Alert writes that failed with an error that is not retried, such as a mapping error. */
  permanentCount: number;
  /** Number of unresolved alert writes per Elasticsearch error type. */
  unresolvedErrorTypes: Record<string, number>;
}

interface NormalizedBulkRequest {
  op: BulkOperationContainer;
  doc: unknown;
}

type BulkResponseItemContainer = Partial<Record<BulkOperationType, BulkResponseItem>>;

interface BulkItemAttempt {
  req: NormalizedBulkRequest;
  res: BulkResponseItemContainer;
}

type BulkItemOutcome = 'success' | 'conflict' | 'alreadyWritten' | 'retryable' | 'permanent';

/** Retries alert writes that failed with a conflict or a retryable error and reports the ones that still failed. */
export async function resolveAlertConflicts(
  params: ResolveAlertConflictsParams
): Promise<ResolveAlertConflictsResult> {
  const { logger, esClient, bulkRequest, bulkResponse, ruleId, ruleType, ruleName } = params;
  const result: ResolveAlertConflictsResult = {
    unresolvedCount: 0,
    permanentCount: 0,
    unresolvedErrorTypes: {},
  };
  if (bulkRequest.operations && bulkRequest.operations?.length === 0) return result;
  if (bulkResponse.items && bulkResponse.items?.length === 0) return result;

  const ruleInfoMessage = `for ${ruleType}:${ruleId} '${ruleName}'`;
  const logTags = { tags: [ruleType, ruleId, 'resolve-alert-conflicts'] };

  // get numbers for a summary log message
  const { success, errors, conflicts, messages } = getResponseStats(bulkResponse);
  if (conflicts === 0 && errors === 0) return result;

  const allMessages = messages.join('; ');
  logger.error(
    `Error writing alerts ${ruleInfoMessage}: ${success} successful, ${conflicts} conflicts, ${errors} errors: ${allMessages}`,
    logTags
  );

  let outcomes = groupByOutcome(
    pairRequestsWithResponses(normalizeRequest(bulkRequest), bulkResponse.items)
  );
  let permanentCount = outcomes.permanent.length;
  logAlreadyWritten(logger, logTags, ruleInfoMessage, outcomes.alreadyWritten);

  for (let retry = 1; retry <= MAX_RETRIES; retry++) {
    const toRetry = [...outcomes.conflict, ...outcomes.retryable];
    if (toRetry.length === 0) break;

    if (outcomes.conflict.length > 0) {
      const conflictRequest = outcomes.conflict.map(({ req }) => req);
      logBulkWriteConflicts(logger, logTags, ruleInfoMessage, conflictRequest);

      // get the fresh versions of those docs
      const freshDocs = await getFreshDocs(esClient, conflictRequest);

      // update the OCC and refresh-able fields
      await updateOCC(conflictRequest, freshDocs);
      await refreshFieldsInDocs(conflictRequest, freshDocs);
    }

    if (outcomes.retryable.length > 0) {
      await delay(getRetryDelayMs(retry));
    }

    logger.info(
      `Retrying bulk update of ${toRetry.length} alerts (retry ${retry} of ${MAX_RETRIES}): ${outcomes.conflict.length} conflicts, ${outcomes.retryable.length} retryable errors ${ruleInfoMessage}`,
      logTags
    );
    const retryRequest = toRetry.map(({ req }) => req);
    const retryResponse = await makeBulkRequest(esClient, logger, bulkRequest, retryRequest);

    outcomes = groupByOutcome(pairRequestsWithResponses(retryRequest, retryResponse.items));
    permanentCount += outcomes.permanent.length;
    logAlreadyWritten(logger, logTags, ruleInfoMessage, outcomes.alreadyWritten);
    logRetryResult(logger, logTags, ruleInfoMessage, retryRequest.length, outcomes);
  }

  const unresolved = [...outcomes.conflict, ...outcomes.retryable];
  const unresolvedErrorTypes = countErrorTypes(unresolved);
  if (unresolved.length > 0) {
    logger.error(
      `Bulk update of ${
        unresolved.length
      } alerts still failed after ${MAX_RETRIES} retries ${ruleInfoMessage}: ${formatErrorTypeCounts(
        unresolvedErrorTypes
      )}`,
      logTags
    );
  }

  return { unresolvedCount: unresolved.length, permanentCount, unresolvedErrorTypes };
}

/** Formats error type counts as `2 circuit_breaking_exception, 1 version_conflict_engine_exception`. */
export function formatErrorTypeCounts(errorTypeCounts: Record<string, number>): string {
  return Object.entries(errorTypeCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
}

function classifyBulkItem(res: BulkResponseItemContainer): BulkItemOutcome {
  const item = getBulkItemResult(res);
  if (!item?.error) return 'success';
  if (item.status === 409 && res.index) return 'conflict';
  // a create can only conflict with a doc that has the same alert UUID, e.g. one written
  // by an earlier attempt of the same request that timed out on the client
  if (item.status === 409 && res.create) return 'alreadyWritten';
  if (
    RETRYABLE_ITEM_STATUS_CODES.has(item.status) ||
    RETRYABLE_ITEM_ERROR_TYPES.has(item.error.type)
  ) {
    return 'retryable';
  }
  return 'permanent';
}

function getBulkItemResult(res: BulkResponseItemContainer): BulkResponseItem | undefined {
  return res.create || res.index || res.update || res.delete;
}

function groupByOutcome(attempts: BulkItemAttempt[]): Record<BulkItemOutcome, BulkItemAttempt[]> {
  const outcomes: Record<BulkItemOutcome, BulkItemAttempt[]> = {
    success: [],
    conflict: [],
    alreadyWritten: [],
    retryable: [],
    permanent: [],
  };
  for (const attempt of attempts) {
    outcomes[classifyBulkItem(attempt.res)].push(attempt);
  }
  return outcomes;
}

function pairRequestsWithResponses(
  requests: NormalizedBulkRequest[],
  items: BulkResponseItemContainer[]
): BulkItemAttempt[] {
  if (requests.length !== items.length) {
    throw new Error('Unexpected number of bulk response items');
  }
  return requests.map((req, index) => ({ req, res: items[index] }));
}

function countErrorTypes(attempts: BulkItemAttempt[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { res } of attempts) {
    const type = getBulkItemResult(res)?.error?.type ?? 'unknown';
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// full jitter: up to 1s, 2s and 4s for the three retries
function getRetryDelayMs(retry: number): number {
  return Math.random() * RETRY_BASE_DELAY_MS * 2 ** (retry - 1);
}

function logAlreadyWritten(
  logger: Logger,
  logTags: { tags: string[] },
  ruleInfoMessage: string,
  alreadyWritten: BulkItemAttempt[]
): void {
  if (alreadyWritten.length === 0) return;
  logger.warn(
    `Skipped creating ${alreadyWritten.length} alerts that already exist ${ruleInfoMessage}`,
    logTags
  );
}

function logRetryResult(
  logger: Logger,
  logTags: { tags: string[] },
  ruleInfoMessage: string,
  retriedCount: number,
  outcomes: Record<BulkItemOutcome, BulkItemAttempt[]>
): void {
  const failed = [...outcomes.conflict, ...outcomes.retryable, ...outcomes.permanent];
  if (failed.length === 0) {
    logger.info(
      `Retried bulk update of ${retriedCount} alerts succeeded ${ruleInfoMessage}`,
      logTags
    );
    return;
  }
  logger.warn(
    `Retried bulk update of ${retriedCount} alerts still had ${
      failed.length
    } errors ${ruleInfoMessage}: ${formatErrorTypeCounts(countErrorTypes(failed))}`,
    logTags
  );
}

// log a warning for each alert write conflict
function logBulkWriteConflicts(
  logger: Logger,
  logTags: { tags: string[] },
  ruleInfoMessage: string,
  conflictRequest: NormalizedBulkRequest[]
): void {
  for (const req of conflictRequest) {
    const alertUuid = req.op?.index?._id || 'unknown';
    const instanceId = get(req.doc, ALERT_INSTANCE_ID) || 'unknown';
    logger.warn(
      `Alert bulk write conflict ${ruleInfoMessage}: alert UUID '${alertUuid}', instance ID '${instanceId}'`,
      logTags
    );
  }
}

// make the bulk request to retry the failed alert writes
async function makeBulkRequest(
  esClient: ElasticsearchClient,
  logger: Logger,
  bulkRequest: BulkRequest,
  retryRequest: NormalizedBulkRequest[]
): Promise<BulkResponse> {
  const operations = retryRequest.flatMap(({ op, doc }) => (op?.delete ? [op] : [op, doc]));
  // just replace the operations from the original request
  const updatedBulkRequest = { ...bulkRequest, operations };

  const bulkResponse = await retryTransientEsErrors(() => esClient.bulk(updatedBulkRequest), {
    logger,
  });

  if (bulkResponse.items.length !== retryRequest.length) {
    throw new Error(
      `Unexpected number of bulk response items retried; expecting ${retryRequest.length}, retried ${bulkResponse.items.length}`
    );
  }
  return bulkResponse;
}

/** Update refreshable fields in the conflict requests. */
async function refreshFieldsInDocs(
  conflictRequests: NormalizedBulkRequest[],
  freshResponses: MgetResponseItem[]
) {
  for (const [conflictRequest, freshResponse] of zip(conflictRequests, freshResponses)) {
    if (!conflictRequest?.op?.index || !freshResponse) continue;

    // @ts-expect-error @elastic/elasticsearch _source is not in the type!
    const freshDoc = freshResponse._source;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conflictDoc = conflictRequest.doc as Record<string, any>;
    if (!freshDoc || !conflictDoc) continue;

    for (const refreshField of REFRESH_FIELDS_ALWAYS) {
      const val = get(freshDoc, refreshField);
      conflictDoc[refreshField] = val;
    }

    // structured this way to make sure all conditional refresh
    // fields are listed in REFRESH_FIELDS_CONDITIONAL when we mget
    for (const refreshField of REFRESH_FIELDS_CONDITIONAL) {
      switch (refreshField) {
        // hamdling for kibana.alert.status: overwrite conflict doc
        // with fresh version if it's not active or recovered (ie, untracked)
        case ALERT_STATUS:
          const freshStatus = get(freshDoc, ALERT_STATUS);

          if (freshStatus !== ALERT_STATUS_ACTIVE && freshStatus !== ALERT_STATUS_RECOVERED) {
            conflictDoc[ALERT_STATUS] = freshStatus;
          }
          break;
      }
    }
  }
}

/** Update the OCC info in the conflict request with the fresh info. */
async function updateOCC(conflictRequests: NormalizedBulkRequest[], freshDocs: MgetResponseItem[]) {
  for (const [req, freshDoc] of zip(conflictRequests, freshDocs)) {
    if (!req?.op?.index || !freshDoc) continue;

    // @ts-expect-error @elastic/elasticsearch _seq_no is not in the type!
    const seqNo: number | undefined = freshDoc._seq_no;
    // @ts-expect-error @elastic/elasticsearch _primary_term is not in the type!
    const primaryTerm: number | undefined = freshDoc._primary_term;

    if (seqNo === undefined) throw new Error('Unexpected undefined seqNo');
    if (primaryTerm === undefined) throw new Error('Unexpected undefined primaryTerm');

    req.op.index.if_seq_no = seqNo;
    req.op.index.if_primary_term = primaryTerm;
  }
}

/** Get the latest version of the conflicted docs, with fields to refresh. */
async function getFreshDocs(
  esClient: ElasticsearchClient,
  conflictRequests: NormalizedBulkRequest[]
): Promise<MgetResponseItem[]> {
  const docs: Array<{ _id: string; _index: string }> = [];

  conflictRequests.forEach((req) => {
    const [id, index] = [req.op?.index?._id, req.op?.index?._index];
    if (!id || !index) return;

    docs.push({ _id: id, _index: index });
  });

  const mgetRes = await esClient.mget<unknown>({ docs, _source_includes: REFRESH_FIELDS_ALL });

  if (mgetRes.docs.length !== docs.length) {
    throw new Error(
      `Unexpected number of mget response docs; expected ${docs.length}, got ${mgetRes.docs.length}`
    );
  }

  return mgetRes.docs;
}

/** Convert a bulk request (op | doc)[] to an array of { op, doc }[]  */
function normalizeRequest(bulkRequest: BulkRequest) {
  if (!bulkRequest.operations) return [];
  const result: NormalizedBulkRequest[] = [];

  let index = 0;
  while (index < bulkRequest.operations.length) {
    // the "op" data
    const op = bulkRequest.operations[index] as NonNullable<BulkOperationContainer>;

    // now the "doc" data, if there is any (none for delete)
    if (op.create || op.index || op.update) {
      index++;
      const doc = bulkRequest.operations[index];
      result.push({ op, doc });
    } else if (op.delete) {
      // no doc for delete op, but it still gets an item in the bulk response
      result.push({ op, doc: undefined });
    } else {
      throw new Error(`Unsupported bulk operation: ${JSON.stringify(op)}`);
    }

    index++;
  }

  return result;
}

interface ResponseStatsResult {
  success: number;
  conflicts: number;
  errors: number;
  messages: string[];
}

// generate a summary of the original bulk request attempt, for logging
function getResponseStats(bulkResponse: BulkResponse): ResponseStatsResult {
  const sanitizedResponse = sanitizeBulkErrorResponse(bulkResponse) as BulkResponse;
  const stats: ResponseStatsResult = { success: 0, conflicts: 0, errors: 0, messages: [] };
  for (const item of sanitizedResponse.items) {
    const op = item.create || item.index || item.update || item.delete;
    if (op?.error) {
      if (op?.status === 409 && op === item.index) {
        stats.conflicts++;
      } else {
        stats.errors++;
        stats.messages.push(op?.error?.reason || 'no bulk reason provided');
      }
    } else {
      stats.success++;
    }
  }
  return stats;
}
