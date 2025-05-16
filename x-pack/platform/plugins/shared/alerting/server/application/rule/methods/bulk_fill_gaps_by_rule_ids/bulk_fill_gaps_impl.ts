/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import type { ScheduleBackfillResults } from '../../../backfill/methods/schedule/types';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import type { BulkFillGapsByRuleIdsParams, BulkFillGapsImplResult } from './types';
import { getBackfillSchedulePayloads } from './get_backfill_schedule_payloads';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

const logProcessedAsAuditEvent = (
  context: RulesClientContext,
  scheduledRules: Array<{ ruleId: string }>,
  allRules: BulkFillGapsByRuleIdsParams['rules']
) => {
  allRules
    .filter((rule) => scheduledRules.find(({ ruleId }) => ruleId === rule.id))
    .forEach(({ id, name }) => {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FILL_GAPS,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
        })
      );
    });
};

const addFailedToErroredRulesArray = (
  erroredRulesArray: BulkFillGapsImplResult['errored'],
  allRules: BulkFillGapsByRuleIdsParams['rules'],
  failedRules: Array<{ ruleId: string }>,
  error: Error
) => {
  allRules
    .filter((rule) => failedRules.find(({ ruleId }) => ruleId === rule.id))
    .forEach((rule) => {
      erroredRulesArray.push({
        rule: {
          id: rule.id,
          name: rule.name,
        },
        step: 'SCHEDULING',
        errorMessage: error?.message ?? 'Error scheduling backfills',
      });
    });
};

export const bulkFillGapsImpl = async (
  context: RulesClientContext,
  { rules, range }: BulkFillGapsByRuleIdsParams
): Promise<BulkFillGapsImplResult> => {
  const outcomes: ScheduleBackfillResults[] = [];
  const errored: BulkFillGapsImplResult['errored'] = [];
  const processedIds = new Set<string>();

  let rulesToBackfill = rules.map(({ id, name }) => {
    return {
      id,
      name,
      gapPagination: {
        // We start fetching gaps from page 1
        page: 1,
      },
    };
  });

  while (rulesToBackfill.length > 0) {
    // We stagger the processing of each rule gaps by fetching 100 at a time. If a rule has more gaps, then the rule is added to
    // "next" list to be processed in the next iteration
    const {
      payloads,
      next,
      errored: erroredRules,
    } = await getBackfillSchedulePayloads(context, {
      rules: rulesToBackfill,
      maxGapPageSize: 100,
      range,
    });

    rulesToBackfill = next;

    errored.push(...erroredRules);

    // Rules might have gaps within the range that don't yield any payload
    // This can happen when they have gaps that are in an "in progress" state
    if (payloads.length === 0) {
      continue;
    }

    payloads.forEach((payload) => processedIds.add(payload.ruleId));
    // Since there is a dedicated errored rules list, we do this to make sure the errored rules are not included in the list of skipped rules
    erroredRules.forEach(({ rule }) => processedIds.add(rule.id));

    try {
      const results = await scheduleBackfill(context, payloads);
      outcomes.push(results);
      logProcessedAsAuditEvent(context, payloads, rules);
    } catch (error) {
      addFailedToErroredRulesArray(errored, rules, payloads, error);
      // If backfilling fails, we stop trying for this batch of rules
      break;
    }
  }

  const skipped = rules
    .filter((rule) => !processedIds.has(rule.id))
    .map((rule) => ({
      id: rule.id,
      name: rule.name,
    }));

  return { outcomes, skipped, errored };
};
