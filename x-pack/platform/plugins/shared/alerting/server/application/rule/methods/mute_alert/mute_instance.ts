/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { updateRuleSo } from '../../../../data/rule';
import { muteAlertQuerySchema, muteAlertParamsSchema } from './schemas';
import type { MuteAlertQuery, MuteAlertParams, MuteAlertBody } from './types';
import type { Rule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { updateMeta } from '../../../../rules_client/lib';
import { snoozeConditionOperator } from '../../../../../common/routes/rule/common/constants/v1';

export async function muteInstance(
  context: RulesClientContext,
  { params, query, body }: { params: MuteAlertParams; query: MuteAlertQuery; body?: MuteAlertBody }
): Promise<void> {
  const ruleId = params.alertId;
  try {
    muteAlertParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  try {
    muteAlertQuerySchema.validate(query);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate query: ${error.message}`);
  }

  const hasConditionalSnooze =
    body && (body.expiresAt || (body.conditions && body.conditions.length > 0));

  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteInstance('${ruleId}')`,
    async () => await muteInstanceWithOCC(context, params, query, body, !!hasConditionalSnooze)
  );
}

async function muteInstanceWithOCC(
  context: RulesClientContext,
  { alertId: ruleId, alertInstanceId }: MuteAlertParams,
  { validateAlertsExistence }: MuteAlertQuery,
  body?: MuteAlertBody,
  isConditionalSnooze?: boolean
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
    RULE_SAVED_OBJECT_TYPE,
    ruleId
  );

  // Choose audit action based on whether this is a conditional snooze
  const auditAction = isConditionalSnooze
    ? RuleAuditAction.SNOOZE_ALERT
    : RuleAuditAction.MUTE_ALERT;

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.MuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: auditAction,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: auditAction,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  // Conditional snooze is redundant when the rule is already muted globally.
  if (attributes.muteAll && isConditionalSnooze) {
    throw Boom.badRequest(
      `Unable to apply conditional snooze to alert instance "${alertInstanceId}" because rule "${ruleId}" is muted via muteAll`
    );
  }

  const indices = context.getAlertIndicesAlias([attributes.alertTypeId], context.spaceId);

  if (validateAlertsExistence) {
    const isExistingAlert = await context.alertsService?.isExistingAlert({
      indices,
      alertId: alertInstanceId,
      ruleId,
    });

    if (!isExistingAlert) {
      throw Boom.notFound(
        `Alert instance with id "${alertInstanceId}" does not exist for rule with id "${ruleId}"`
      );
    }
  }

  if (attributes.muteAll) {
    return;
  }

  const mutedInstanceIds = attributes.mutedInstanceIds || [];

  if (isConditionalSnooze && body) {
    // Conditional snooze: persist config on rule SO (durable, survives alert lifecycle)
    // and materialize ALERT_MUTED on the current AAD doc (for query-time filtering).
    const existing = attributes.snoozedInstances ?? [];
    const snoozedInstances = existing
      .filter((e) => e.instanceId !== alertInstanceId)
      .concat({
        instanceId: alertInstanceId,
        ...(body.expiresAt ? { expiresAt: body.expiresAt } : {}),
        ...(body.conditions?.length ? { conditions: body.conditions } : {}),
        ...(body.conditions?.length
          ? { conditionOperator: body.conditionOperator ?? snoozeConditionOperator.ANY }
          : {}),
      });

    await updateRuleSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      savedObjectsUpdateOptions: { version },
      id: ruleId,
      updateRuleAttributes: updateMeta(context, {
        snoozedInstances,
        // Transitioning from simple mute -> conditional snooze: remove from mutedInstanceIds
        ...(mutedInstanceIds.includes(alertInstanceId)
          ? { mutedInstanceIds: mutedInstanceIds.filter((id) => id !== alertInstanceId) }
          : {}),
        updatedBy: await context.getUserName(),
        updatedAt: new Date().toISOString(),
      }),
    });

    // Also set ALERT_MUTED=true on the current AAD doc for query-time filtering when
    // alert indices are available. Rule SO remains the durable source of truth.
    if (indices && indices.length > 0) {
      await context.alertsService?.snoozeAlertInstance({
        ruleId,
        alertInstanceId,
        indices,
        logger: context.logger,
        expiresAt: body.expiresAt,
        conditions: body.conditions,
        conditionOperator: body.conditionOperator ?? 'any',
      });
    }

    return;
  }

  if (mutedInstanceIds.includes(alertInstanceId)) {
    return;
  }

  // Simple mute: add to mutedInstanceIds on the rule SO and set kibana.alert.muted on the doc.
  // Note: if the alert is already in snoozedInstances, the simple mute is additive.
  // The alert will be muted by both mechanisms; explicit unsnooze is required to remove
  // the conditional snooze, and unmute to remove the simple mute.
  mutedInstanceIds.push(alertInstanceId);

  await updateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsUpdateOptions: { version },
    id: ruleId,
    updateRuleAttributes: updateMeta(context, {
      mutedInstanceIds,
      updatedBy: await context.getUserName(),
      updatedAt: new Date().toISOString(),
    }),
  });

  if (indices && indices.length > 0) {
    await context.alertsService?.muteAlertInstance({
      ruleId,
      alertInstanceId,
      indices,
      logger: context.logger,
    });
  }
}
