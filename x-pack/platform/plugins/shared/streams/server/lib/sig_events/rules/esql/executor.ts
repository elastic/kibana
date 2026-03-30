/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorOptions,
} from '@kbn/alerting-plugin/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { PersistenceServices } from '@kbn/rule-registry-plugin/server';
import { extractBucketIntervalMs } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import moment from 'moment';
import objectHash from 'object-hash';
import { MAX_ALERTS_PER_EXECUTION, MATCH_LOOKBACK_MINUTES, DEFAULT_STATS_LOOKBACK_MINUTES } from './common';
import { buildEsqlSearchRequest } from './lib/build_esql_search_request';
import { buildStatsEsqlSearchRequest } from './lib/build_stats_esql_search_request';
import { executeEsqlRequest } from './lib/execute_esql_request';
import { executeStatsEsqlRequest } from './lib/execute_stats_esql_request';
import type { EsqlRuleInstanceState, EsqlRuleParams } from './types';

type ExecutorOptions = RuleExecutorOptions<
  EsqlRuleParams,
  EsqlRuleInstanceState,
  AlertInstanceState,
  AlertInstanceContext,
  'default',
  Alert
> & {
  services: PersistenceServices;
};

export async function getRuleExecutor(options: ExecutorOptions) {
  const queryType = options.params.type ?? 'match';
  return queryType === 'stats' ? executeStatsPath(options) : executeMatchPath(options);
}

async function executeMatchPath(options: ExecutorOptions) {
  const { services, params, logger, state, startedAt, spaceId, rule } = options;
  const { scopedClusterClient, alertWithPersistence } = services;

  const previousOriginalDocumentIds = state.previousOriginalDocumentIds ?? [];

  const now = moment(startedAt);

  const esqlRequest = buildEsqlSearchRequest({
    query: params.query,
    timestampField: params.timestampField,
    from: now.clone().subtract(MATCH_LOOKBACK_MINUTES, 'minutes').toISOString(),
    to: now.clone().toISOString(),
    previousOriginalDocumentIds,
  });

  const results = await executeEsqlRequest({
    esClient: scopedClusterClient.asCurrentUser,
    esqlRequest,
    logger,
  });

  if (results.length === 0) {
    return {
      state: {
        previousOriginalDocumentIds: [],
      },
    };
  }

  const alertDocIdToDocumentIdMap = new Map<string, string>();
  const alerts = results.map((result) => {
    const alertDocId = objectHash([result._id, rule.id, spaceId]);
    alertDocIdToDocumentIdMap.set(alertDocId, result._id);

    return {
      _id: alertDocId,
      _source: {
        original_source: {
          _id: result._id,
          ...result._source,
        },
      },
    };
  });

  const { createdAlerts, errors } = await alertWithPersistence(
    alerts,
    false,
    MAX_ALERTS_PER_EXECUTION
  );

  if (!isEmpty(errors)) {
    logger.debug(() => `Alerts bulk process finished with errors: ${JSON.stringify(errors)}`);
  }

  const originalDocumentIds = createdAlerts.map(
    (alert) => alertDocIdToDocumentIdMap.get(alert._id)!
  );

  return {
    state: {
      previousOriginalDocumentIds: originalDocumentIds,
    },
  };
}

function alignToBucketBoundary(timestampMs: number, intervalMs: number): number {
  return Math.floor(timestampMs / intervalMs) * intervalMs;
}

async function executeStatsPath(options: ExecutorOptions) {
  const { services, params, logger, state, startedAt, spaceId, rule } = options;
  const { scopedClusterClient, alertWithPersistence } = services;

  const previousFiringIds = new Set(state.previousFiringIds ?? []);
  const nowMs = moment(startedAt).valueOf();

  if (params.lookbackMinutes == null) {
    logger.warn(
      `STATS rule "${rule.id}" has no lookbackMinutes configured; falling back to ${DEFAULT_STATS_LOOKBACK_MINUTES} minutes. ` +
        `Re-promote or re-sync the query to set the correct lookback.`
    );
  }
  const lookbackMs = (params.lookbackMinutes ?? DEFAULT_STATS_LOOKBACK_MINUTES) * 60_000;

  const bucketIntervalMs = extractBucketIntervalMs(params.query);

  let from: string;
  let to: string;

  if (bucketIntervalMs) {
    const toMs = alignToBucketBoundary(nowMs, bucketIntervalMs);
    const fromMs = alignToBucketBoundary(toMs - lookbackMs, bucketIntervalMs);
    from = new Date(fromMs).toISOString();
    to = new Date(toMs).toISOString();
  } else {
    from = new Date(nowMs - lookbackMs).toISOString();
    to = new Date(nowMs).toISOString();
  }

  const esqlRequest = buildStatsEsqlSearchRequest({
    query: params.query,
    timestampField: params.timestampField,
    from,
    to,
  });

  const results = await executeStatsEsqlRequest({
    esClient: scopedClusterClient.asCurrentUser,
    esqlRequest,
    logger,
  });

  if (results.length === 0) {
    return { state: { previousFiringIds: [...previousFiringIds] } };
  }

  if (results.length >= MAX_ALERTS_PER_EXECUTION) {
    logger.warn(
      `STATS query returned ${results.length} rows (limit reached). Some aggregate alerts may be dropped.`
    );
  }

  const allAlertIds: string[] = [];
  const newAlerts: Array<{ _id: string; _source: { original_source: Record<string, unknown> } }> =
    [];

  for (const row of results) {
    const alertId = objectHash([row.bucket, ...row.groupValues, rule.id, spaceId]);
    allAlertIds.push(alertId);

    if (!previousFiringIds.has(alertId)) {
      newAlerts.push({
        _id: alertId,
        _source: { original_source: row.columns },
      });
    }
  }

  if (newAlerts.length > 0) {
    const { errors } = await alertWithPersistence(
      newAlerts,
      false,
      MAX_ALERTS_PER_EXECUTION
    );

    if (!isEmpty(errors)) {
      logger.debug(() => `Alerts bulk process finished with errors: ${JSON.stringify(errors)}`);
    }
  }

  return {
    state: {
      previousFiringIds: allAlertIds.slice(0, MAX_ALERTS_PER_EXECUTION),
    },
  };
}
