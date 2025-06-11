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
import type { BulkFillGapsByRuleIdsResult, BulkFillGapsByRuleIdsParams } from './types';
import { logProcessedAsAuditEvent, toBulkGapFillError } from './utils';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { batchBackfillRuleGaps } from './batch_backfill_rule_gaps';
import { bulkFillGapsByRuleIdParamsSchema } from './schemas';

const DEFAULT_MAX_BACKFILL_CONCURRENCY = 10;

export const bulkFillGapsByRuleIds = async (
  context: RulesClientContext,
  { rules, range }: BulkFillGapsByRuleIdsParams,
  options?: { maxBackfillConcurrency: number }
): Promise<BulkFillGapsByRuleIdsResult> => {
  const result = bulkFillGapsByRuleIdParamsSchema.safeParse(range);
  if (!result.success) {
    const message = result.error.errors.map((error) => error.message).join(' ');
    throw Boom.badRequest(
      `Error validating backfill schedule parameters "${JSON.stringify(range)}" - ${message}`
    );
  }

  const errored: BulkFillGapsByRuleIdsResult['errored'] = [];
  const skipped: BulkFillGapsByRuleIdsResult['skipped'] = [];
  const backfilled: BulkFillGapsByRuleIdsParams['rules'] = [];
  const eventLogClient = await context.getEventLogClient();
  const maxBackfillConcurrency =
    options?.maxBackfillConcurrency ?? DEFAULT_MAX_BACKFILL_CONCURRENCY;

  // Make sure user has access to these rules
  const rulesByAlertType = mapValues(
    groupBy(rules, (rule) => `${rule.alertTypeId}<>${rule.consumer}`),
    (groupedRules) => ({
      alertTypeId: groupedRules[0].alertTypeId,
      consumer: groupedRules[0].consumer,
      rules: groupedRules,
    })
  );

  const authorizedRules: typeof rules = [];
  for (const { alertTypeId, consumer, rules: rulesBatch } of Object.values(rulesByAlertType)) {
    try {
      await context.authorization.ensureAuthorized({
        ruleTypeId: alertTypeId,
        consumer,
        operation: WriteOperations.FillGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });

      authorizedRules.push(...rulesBatch);
    } catch (error) {
      rulesBatch.forEach((rule) => {
        logProcessedAsAuditEvent(context, { id: rule.id, name: rule.name }, error);
        errored.push(toBulkGapFillError(rule, 'BULK_GAPS_FILL_STEP_ACCESS_VALIDATION', error));
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
      });

      if (backfillResult.outcome === 'backfilled') {
        backfilled.push(rule);
      } else if (backfillResult.outcome === 'errored') {
        errored.push(backfillResult.error);
      } else {
        skipped.push(rule);
      }
    },
    {
      concurrency: maxBackfillConcurrency,
    }
  );

  await eventLogClient.refreshIndex();
  return { backfilled, skipped, errored };
};
