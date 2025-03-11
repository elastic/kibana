/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { RulesClientContext } from '../../../../rules_client';

import { findGapsById } from '../../../../lib/rule_gaps/find_gaps_by_id';
import { FillGapByIdParams } from './types';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { getRule } from '../get/get_rule';
import { SanitizedRuleWithLegacyId } from '../../../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

export async function fillGapById(context: RulesClientContext, params: FillGapByIdParams) {
  try {
    const rule = (await getRule(context, {
      id: params.ruleId,
      includeLegacyId: true,
    })) as SanitizedRuleWithLegacyId;
    try {
      // Make sure user has access to this rule
      await context.authorization.ensureAuthorized({
        ruleTypeId: rule.alertTypeId,
        consumer: rule.consumer,
        operation: WriteOperations.FillGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FILL_GAPS,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.name },
          error,
        })
      );
      throw error;
    }

    const eventLogClient = await context.getEventLogClient();
    const gaps = await findGapsById({
      params: {
        gapIds: [params.gapId],
        page: 1,
        perPage: 1,
        ruleId: params.ruleId,
      },
      eventLogClient,
      logger: context.logger,
    });

    const gap = gaps[0];

    if (!gap) {
      throw Boom.notFound(`Gap not found for ruleId ${params.ruleId} and gapId ${params.gapId}`);
    }

    const gapState = gap.getState();

    const allGapsToSchedule =
      gapState.unfilledIntervals.map((interval) => ({
        ruleId: params.ruleId,
        start: interval.gte,
        end: interval.lte,
      })) ?? [];

    if (allGapsToSchedule.length === 0) {
      throw Boom.badRequest(`No unfilled intervals found for ruleId ${params.ruleId}`);
    }

    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FILL_GAPS,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.name },
      })
    );

    const scheduleBackfillResponse = await scheduleBackfill(context, allGapsToSchedule);

    await eventLogClient.refreshIndex();

    return scheduleBackfillResponse;
  } catch (err) {
    const errorMessage = `Failed to find gap and schedule manual rule run for ruleId ${params.ruleId}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
