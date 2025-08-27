/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import Boom from '@hapi/boom';
import { groupBy, mapValues } from 'lodash';
import type { RulesClientContext } from '../../../../rules_client';
import {
  type BulkFillGapsByRuleIdsResult,
  type BulkFillGapsByRuleIdsParams,
  type BulkFillGapsByRuleIdsOptions,
  BulkGapsFillStep,
  BulkFillGapsScheduleResult,
} from './types';
import { logProcessedAsAuditEvent, toBulkGapFillError } from './utils';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { batchBackfillRuleGaps } from './batch_backfill_rule_gaps';
import { validateBackfillSchedule } from '../../../../../common/lib';

const DEFAULT_MAX_BACKFILL_CONCURRENCY = 10;

export const bulkFillGapsByRuleIds = async (
  context: RulesClientContext,
  { rules, range }: BulkFillGapsByRuleIdsParams,
  options: BulkFillGapsByRuleIdsOptions
): Promise<BulkFillGapsByRuleIdsResult> => {
  const errorString = validateBackfillSchedule(range.start, range.end);
  if (errorString) {
    throw Boom.badRequest(
      `Error validating backfill schedule parameters "${JSON.stringify(range)}" - ${errorString}`
    );
  }

  const errored: BulkFillGapsByRuleIdsResult['errored'] = [];
  const skipped: BulkFillGapsByRuleIdsResult['skipped'] = [];
  const backfilled: BulkFillGapsByRuleIdsParams['rules'] = [];
  const eventLogClient = await context.getEventLogClient();
  const maxBackfillConcurrency = Math.max(
    options?.maxBackfillConcurrency ?? DEFAULT_MAX_BACKFILL_CONCURRENCY,
    DEFAULT_MAX_BACKFILL_CONCURRENCY
  );

  // Make sure user has access to these rules
  const rulesByRuleType = mapValues(
    groupBy(rules, (rule) => `${rule.alertTypeId}<>${rule.consumer}`),
    (groupedRules) => ({
      ruleTypeId: groupedRules[0].alertTypeId,
      consumer: groupedRules[0].consumer,
      rules: groupedRules,
    })
  );

  const authorizedRules: typeof rules = [];
  for (const { ruleTypeId, consumer, rules: rulesBatch } of Object.values(rulesByRuleType)) {
    try {
      await context.authorization.ensureAuthorized({
        ruleTypeId,
        consumer,
        operation: WriteOperations.FillGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });

      authorizedRules.push(...rulesBatch);
    } catch (error) {
      rulesBatch.forEach((rule) => {
        logProcessedAsAuditEvent(context, { id: rule.id, name: rule.name }, error);
        errored.push(toBulkGapFillError(rule, BulkGapsFillStep.ACCESS_VALIDATION, error));
        return;
      });
    }
  }

  await pMap(
    authorizedRules,
    async (rule) => {
      const backfillResult = await batchBackfillRuleGaps(context, {
        rule,
        range,
        maxGapCountPerRule: options.maxGapCountPerRule,
      });

      switch (backfillResult.outcome) {
        case BulkFillGapsScheduleResult.BACKFILLED:
          backfilled.push(rule);
          break;
        case BulkFillGapsScheduleResult.ERRORED:
          errored.push(backfillResult.error);
          break;
        case BulkFillGapsScheduleResult.SKIPPED:
          skipped.push(rule);
          break;
      }
    },
    {
      concurrency: maxBackfillConcurrency,
    }
  );

  await eventLogClient.refreshIndex();
  return { backfilled, skipped, errored };
};
