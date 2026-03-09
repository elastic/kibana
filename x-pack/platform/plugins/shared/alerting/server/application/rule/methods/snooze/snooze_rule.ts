/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { withSpan } from '@kbn/apm-utils';
import { RuleChangeTrackingAction } from '@kbn/alerting-types';
import { ruleSnoozeScheduleSchema } from '../../../../../common/routes/rule/request';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getRuleSavedObject } from '../../../../rules_client/lib';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { validateSnoozeStartDate } from '../../../../lib/validate_snooze_date';
import { RuleMutedError } from '../../../../lib/errors/rule_muted';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { RawRule, SanitizedRule } from '../../../../types';
import {
  getSnoozeAttributes,
  verifySnoozeAttributeScheduleLimit,
} from '../../../../rules_client/common';
import { updateRuleSo } from '../../../../data/rule';
import { updateMetaAttributes } from '../../../../rules_client/lib/update_meta_attributes';
import type { RuleParams } from '../../types';
import { transformRuleDomainToRule, transformRuleAttributesToRuleDomain } from '../../transforms';
import { snoozeRuleParamsSchema } from './schemas';
import type { SnoozeRuleOptions } from './types';

export async function snoozeRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  { id, snoozeSchedule }: SnoozeRuleOptions
): Promise<SanitizedRule<Params>> {
  try {
    snoozeRuleParamsSchema.validate({ id });
    ruleSnoozeScheduleSchema.validate({ ...snoozeSchedule });
  } catch (error) {
    throw Boom.badRequest(`Error validating snooze - ${error.message}`);
  }
  const snoozeDateValidationMsg = validateSnoozeStartDate(snoozeSchedule.rRule.dtstart);
  if (snoozeDateValidationMsg) {
    throw new RuleMutedError(snoozeDateValidationMsg);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.snooze('${id}', ${JSON.stringify(snoozeSchedule, null, 4)})`,
    async () => await snoozeWithOCC(context, { id, snoozeSchedule })
  );
}

async function snoozeWithOCC<Params extends RuleParams = never>(
  context: RulesClientContext,
  { id, snoozeSchedule }: SnoozeRuleOptions
) {
  const { attributes, references, version } = await withSpan(
    { name: 'getRuleSavedObject', type: 'rules' },
    () =>
      getRuleSavedObject(context, {
        ruleId: id,
      })
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Snooze,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.SNOOZE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.SNOOZE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const newAttrs = getSnoozeAttributes(attributes, snoozeSchedule);

  try {
    verifySnoozeAttributeScheduleLimit(newAttrs);
  } catch (error) {
    throw Boom.badRequest(error.message);
  }

  const username = await context.getUserName();

  const updatedRuleRaw = await updateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsUpdateOptions: { version },
    id,
    updateRuleAttributes: updateMetaAttributes(context, {
      ...newAttrs,
      updatedBy: username,
      updatedAt: new Date().toISOString(),
    }),
  });

  // Success? Track changes
  const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId!);
  if (context.changeTrackingService && ruleType.trackChanges) {
    const change = {
      objectId: id,
      objectType: RULE_SAVED_OBJECT_TYPE,
      module: ruleType.solution,
      before: { attributes, references },
      after: {
        attributes: { ...attributes, ...updatedRuleRaw.attributes } as RawRule,
        references: updatedRuleRaw.references || [],
      },
    };
    await context.changeTrackingService.log(change, {
      action: RuleChangeTrackingAction.ruleSnooze,
      username: username ?? 'unknown',
      spaceId: context.spaceId,
      refresh: 'wait_for',
    });
  }

  const ruleDomain = transformRuleAttributesToRuleDomain<Params>(
    updatedRuleRaw.attributes as RawRule,
    {
      id: updatedRuleRaw.id,
      logger: context.logger,
      ruleType,
      references: updatedRuleRaw.references,
    },
    context.isSystemAction
  );

  const rule = transformRuleDomainToRule<Params>(ruleDomain);

  return rule as SanitizedRule<Params>;
}
