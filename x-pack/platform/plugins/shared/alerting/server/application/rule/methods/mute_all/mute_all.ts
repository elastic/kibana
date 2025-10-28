/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ALERT_MUTED, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { RawRule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { partiallyUpdateRule, RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { updateMetaAttributes } from '../../../../rules_client/lib';
import { clearUnscheduledSnoozeAttributes } from '../../../../rules_client/common';
import type { MuteAllRuleParams } from './types';
import { muteAllRuleParamsSchema } from './schemas';

export async function muteAll(
  context: RulesClientContext,
  { id }: MuteAllRuleParams
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteAll('${id}')`,
    async () => await muteAllWithOCC(context, { id })
  );
}

async function muteAllWithOCC(context: RulesClientContext, params: MuteAllRuleParams) {
  try {
    muteAllRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating mute all parameters - ${error.message}`);
  }

  const { id } = params;
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<RawRule>(
    RULE_SAVED_OBJECT_TYPE,
    id
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.MuteAll,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.MUTE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.MUTE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const esClient = context.elasticsearchClient;
  const indices = context.getAlertIndicesAlias([attributes.alertTypeId], context.spaceId);

  if (indices && indices.length > 0) {
    try {
      await esClient.updateByQuery({
        index: indices,
        conflicts: 'proceed',
        refresh: true,
        query: {
          term: { [ALERT_RULE_UUID]: id },
        },
        script: {
          source: `ctx._source['${ALERT_MUTED}'] = true;`,
          lang: 'painless',
        },
      });
    } catch (error) {
      context.logger.error(
        `Error updating muted field for all alerts in rule ${id}: ${error.message}`
      );
    }
  }

  const updateAttributes = updateMetaAttributes(context, {
    muteAll: true,
    mutedInstanceIds: [],
    snoozeSchedule: clearUnscheduledSnoozeAttributes(attributes),
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
  });
  const updateOptions = { version };

  await partiallyUpdateRule(
    context.unsecuredSavedObjectsClient,
    id,
    updateAttributes,
    updateOptions
  );
}
