/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server/lib/errors';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { Rule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { RunSoonParams } from './types';

export async function runSoon(context: RulesClientContext, params: RunSoonParams) {
  const { id, force } = params;
  const { attributes } = await context.unsecuredSavedObjectsClient.get<Rule>(
    RULE_SAVED_OBJECT_TYPE,
    id
  );
  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.RunSoon,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.RUN_SOON,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.RUN_SOON,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  // Check that the rule is enabled
  if (!attributes.enabled) {
    return i18n.translate('xpack.alerting.rulesClient.runSoon.disabledRuleError', {
      defaultMessage: 'Error running rule: rule is disabled',
    });
  }

  try {
    const { forced, conflict } = await context.taskManager.runSoon(
      attributes.scheduledTaskId ? attributes.scheduledTaskId : id,
      force
    );

    if (forced) {
      context.logger.info(`Rule ${id} was forced to run soon despite being in "running" status.`);
    }

    if (conflict) {
      // The task store update raced with another concurrent update and was
      // rejected with a 409 — the task was not actually rescheduled. Surface
      // this to callers as a soft failure so they can retry.
      // See https://github.com/elastic/kibana/issues/259686.
      return i18n.translate('xpack.alerting.rulesClient.runSoon.taskUpdateConflict', {
        defaultMessage: 'Error running rule: task scheduling conflicted, please retry',
      });
    }
  } catch (err) {
    if (err instanceof TaskAlreadyRunningError) {
      return force
        ? i18n.translate('xpack.alerting.rulesClient.runSoon.ruleIsRunning', {
            defaultMessage: 'Rule is already running and cannot be forced',
          })
        : i18n.translate('xpack.alerting.rulesClient.runSoon.ruleIsRunning', {
            defaultMessage: 'Rule is already running',
          });
    }

    return i18n.translate('xpack.alerting.rulesClient.runSoon.runSoonError', {
      defaultMessage: 'Error running rule: {errMessage}',
      values: {
        errMessage: err.message,
      },
    });
  }
}
