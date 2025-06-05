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
import type { ScheduleBackfillParams } from '../../../backfill/methods/schedule/types';
import type { BulkFillGapsByRuleIdsResult, BulkFillGapsByRuleIdsParams } from './types';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import type { RuleAuditEventParams } from '../../../../rules_client/common/audit_events';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { toBulkGapFillError } from './utils';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { getBackfillPayloadForRuleGaps } from './get_backfill_payload_for_rule_gaps';
import type { Gap } from '../../../../lib/rule_gaps/gap';
import { bulkFillGapsByRuleIdParamsSchema } from './schemas';

const DEFAULT_MAX_BACKFILL_CONCURRENCY = 10;

const logProcessedAsAuditEvent = (
  context: RulesClientContext,
  { id, name }: { id: string; name: string },
  error?: Error
) => {
  const payload: RuleAuditEventParams = {
    action: RuleAuditAction.FILL_GAPS,
    savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
  };
  if (error) {
    payload.error = error;
  }
  context.auditLogger?.log(ruleAuditEvent(payload));
};

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
  const outcomes: BulkFillGapsByRuleIdsResult['outcomes'] = [];
  const eventLogClient = await context.getEventLogClient();
  const maxBackfillConcurrency =
    options?.maxBackfillConcurrency ?? DEFAULT_MAX_BACKFILL_CONCURRENCY;

  // Make sure user has access to these rules
  const alertTypes = mapValues(
    groupBy(rules, (rule) => `${rule.alertTypeId}<>${rule.consumer}`),
    (groupedRules) => ({
      alertTypeId: groupedRules[0].alertTypeId,
      consumer: groupedRules[0].consumer,
      rules: groupedRules,
    })
  );

  const authorizedRules: typeof rules = [];
  for (const { alertTypeId, consumer, rules: rulesBatch } of Object.values(alertTypes)) {
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
      const { id, name } = rule;

      let payload: ScheduleBackfillParams[0];
      let gaps: Gap[];
      try {
        const { backfillRequestPayload, gaps: allGaps } = await getBackfillPayloadForRuleGaps(
          eventLogClient,
          context.logger,
          {
            ruleId: id,
            range,
          }
        );
        payload = backfillRequestPayload;
        gaps = allGaps;
      } catch (error) {
        logProcessedAsAuditEvent(context, { id, name }, error);
        errored.push(toBulkGapFillError(rule, 'BULK_GAPS_FILL_STEP_GAPS_RESOLUTION', error));
        return;
      }

      // Rules might have gaps within the range that don't yield any payload
      // This can happen when they have gaps that are in an "in progress" state
      if (payload.ranges.length === 0) {
        skipped.push(rule);
        return;
      }

      try {
        const results = await scheduleBackfill(context, [payload], gaps);
        outcomes.push(results);
        logProcessedAsAuditEvent(context, rule);
      } catch (error) {
        logProcessedAsAuditEvent(context, { id, name }, error);
        errored.push(toBulkGapFillError(rule, 'BULK_GAPS_FILL_STEP_SCHEDULING', error));
      }
    },
    {
      concurrency: maxBackfillConcurrency,
    }
  );

  await eventLogClient.refreshIndex();
  return { outcomes, skipped, errored };
};
