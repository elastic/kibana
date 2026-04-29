/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';
import Boom from '@hapi/boom';
import { withSpan } from '@kbn/apm-utils';
import type { SavedObjectReference, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { validateAndAuthorizeSystemActions } from '../../../../lib/validate_authorize_system_actions';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { parseDuration } from '../../../../../common';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  validateRuleTypeParams,
  getRuleNotifyWhenType,
  getDefaultMonitoringRuleDomainProperties,
  getRuleExecutionStatusPending,
} from '../../../../lib';
import {
  extractReferences,
  validateActions,
  addGeneratedActionValues,
  updateMeta,
} from '../../../../rules_client/lib';
import { apiKeyAsRuleDomainProperties } from '../../../../rules_client/common';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext, BulkOperationError } from '../../../../rules_client/types';
import type { RuleDomain, RuleParams } from '../../types';
import type { RawRule, SanitizedRule } from '../../../../types';
import {
  transformRuleAttributesToRuleDomain,
  transformRuleDomainToRuleAttributes,
  transformRuleDomainToRule,
} from '../../transforms';
import { ruleDomainSchema } from '../../schemas';
import { createRuleDataSchema } from '../create/schemas';
import { bulkCreateRulesSo } from '../../../../data/rule';
import type { BulkCreateRulesParams, BulkCreateRulesResult, BulkCreateRulesItem } from './types';

export const ENABLED_RULE_REJECTION_MESSAGE =
  'bulkCreateRules only supports disabled rules; use bulkEnableRules to enable rules after creation';

interface PreparedRule {
  ruleId: string;
  rawRule: RawRule;
  references: SavedObjectReference[];
}

export async function bulkCreateRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: BulkCreateRulesParams<Params>
): Promise<BulkCreateRulesResult<Params>> {
  const { rules: inputs } = params;
  const total = inputs.length;
  const errors: BulkOperationError[] = [];

  if (total === 0) {
    return { rules: [], errors, total };
  }

  const username = await context.getUserName();
  const actionsClient = await context.getActionsClient();

  // Reject every input that asks for an enabled rule. Callers must follow up
  // with bulkEnableRules to schedule a task and issue an API key.
  const indexesToPrepare: number[] = [];
  inputs.forEach((input, index) => {
    if (input.data.enabled) {
      errors.push({
        message: ENABLED_RULE_REJECTION_MESSAGE,
        rule: {
          id: input.options?.id ?? 'n/a',
          name: input.data.name,
        },
      });
      return;
    }
    indexesToPrepare.push(index);
  });

  // Phase 1: per-rule prepare with isolated try/catch.
  const prepareResults = await Promise.all(
    indexesToPrepare.map((index) =>
      prepareRule<Params>({
        context,
        actionsClient,
        username,
        input: inputs[index],
        errors,
      })
    )
  );

  const preparedRules = prepareResults.filter((r): r is PreparedRule => r !== null);

  if (preparedRules.length === 0) {
    return { rules: [], errors, total };
  }

  const bulkCreateAttributes: Array<SavedObjectsBulkCreateObject<RawRule>> = preparedRules.map(
    (prepared) => ({
      type: RULE_SAVED_OBJECT_TYPE,
      id: prepared.ruleId,
      attributes: prepared.rawRule,
      references: prepared.references,
    })
  );

  // Phase 2: persist all rule SOs in one bulkCreate call.
  const bulkCreateResult = await withSpan(
    { name: 'unsecuredSavedObjectsClient.bulkCreate', type: 'rules' },
    () =>
      bulkCreateRulesSo({
        savedObjectsClient: context.unsecuredSavedObjectsClient,
        bulkCreateRuleAttributes: bulkCreateAttributes,
      })
  );

  // Walk per-row results, separating successes and failures.
  const rules: Array<SanitizedRule<Params>> = [];
  bulkCreateResult.saved_objects.forEach((so, idx) => {
    const prepared = preparedRules[idx];
    if (so.error) {
      errors.push({
        message: so.error.message ?? 'n/a',
        status: so.error.statusCode,
        rule: {
          id: prepared.ruleId,
          name: prepared.rawRule.name ?? 'n/a',
        },
      });
      return;
    }

    const ruleType = context.ruleTypeRegistry.get(so.attributes.alertTypeId);
    const ruleDomain = transformRuleAttributesToRuleDomain<Params>(
      so.attributes,
      {
        id: so.id,
        logger: context.logger,
        ruleType,
        references: so.references,
      },
      (connectorId: string) => actionsClient.isSystemAction(connectorId)
    );
    try {
      ruleDomainSchema.validate(ruleDomain);
    } catch (e) {
      context.logger.warn(
        `Error validating bulk created rule domain object for id: ${so.id}, ${e}`
      );
    }
    rules.push(
      transformRuleDomainToRule<Params>(ruleDomain, { isPublic: true }) as SanitizedRule<Params>
    );
  });

  return { rules, errors, total };
}

interface PrepareRuleParams<Params extends RuleParams> {
  context: RulesClientContext;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  username: string | null;
  input: BulkCreateRulesItem<Params>;
  errors: BulkOperationError[];
}

async function prepareRule<Params extends RuleParams>({
  context,
  actionsClient,
  username,
  input,
  errors,
}: PrepareRuleParams<Params>): Promise<PreparedRule | null> {
  const { data: initialData, options, allowMissingConnectorSecrets } = input;
  const id = options?.id || SavedObjectsUtils.generateId();

  try {
    const { actions: genAction, systemActions: genSystemActions } = await addGeneratedActionValues(
      initialData.actions,
      initialData.systemActions,
      context
    );
    const data = {
      ...initialData,
      actions: genAction,
      systemActions: genSystemActions,
    };

    try {
      createRuleDataSchema.validate(data);
    } catch (error) {
      throw Boom.badRequest(`Error validating create data - ${error.message}`);
    }

    // Throws 400 if rule type unregistered.
    context.ruleTypeRegistry.get(data.alertTypeId);

    try {
      await withSpan({ name: 'authorization.ensureAuthorized', type: 'rules' }, async () =>
        context.authorization.ensureAuthorized({
          ruleTypeId: data.alertTypeId,
          consumer: data.consumer,
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      );
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.CREATE,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: data.name },
          error,
        })
      );
      throw error;
    }

    context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);
    const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);
    const validatedRuleTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);

    await withSpan({ name: 'validateActions', type: 'rules' }, () =>
      validateActions(context, ruleType, data, allowMissingConnectorSecrets)
    );

    await withSpan({ name: 'validateAndAuthorizeSystemActions', type: 'rules' }, () =>
      validateAndAuthorizeSystemActions({
        actionsClient,
        actionsAuthorization: context.actionsAuthorization,
        connectorAdapterRegistry: context.connectorAdapterRegistry,
        systemActions: data.systemActions ?? [],
        rule: { consumer: data.consumer, producer: ruleType.producer },
      })
    );

    const intervalInMs = parseDuration(data.schedule.interval);
    if (
      intervalInMs < context.minimumScheduleIntervalInMs &&
      context.minimumScheduleInterval.enforce
    ) {
      throw Boom.badRequest(
        `Error creating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
      );
    }
    if (
      intervalInMs < context.minimumScheduleIntervalInMs &&
      !context.minimumScheduleInterval.enforce
    ) {
      context.logger.warn(
        `Rule schedule interval (${data.schedule.interval}) for "${ruleType.id}" rule type with ID "${id}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent creation of these rules.`
      );
    }

    const allActions = [...data.actions, ...(data.systemActions ?? [])];
    const artifacts = data.artifacts ?? {};
    const {
      references,
      params: updatedParams,
      actions: actionsWithRefs,
      artifacts: artifactsWithRefs,
    } = await withSpan({ name: 'extractReferences', type: 'rules' }, () =>
      extractReferences(context, ruleType, allActions, validatedRuleTypeParams, artifacts)
    );

    const createTime = Date.now();
    const lastRunTimestamp = new Date();
    const legacyId = Semver.lt(context.kibanaVersion, '8.0.0') ? id : null;
    const notifyWhen = getRuleNotifyWhenType(data.notifyWhen ?? null, data.throttle ?? null);
    const throttle = data.throttle ?? null;
    const { systemActions, actions: _actions, ...restData } = data;

    // Disabled rules never get an API key (matches createRule behaviour).
    const apiKeyProps = apiKeyAsRuleDomainProperties(null, username, false);

    const ruleAttributes = transformRuleDomainToRuleAttributes({
      actionsWithRefs,
      artifactsWithRefs,
      rule: {
        ...restData,
        ...apiKeyProps,
        id,
        createdBy: username,
        updatedBy: username,
        createdAt: new Date(createTime),
        updatedAt: new Date(createTime),
        snoozeSchedule: [],
        muteAll: false,
        mutedInstanceIds: [],
        notifyWhen,
        throttle,
        executionStatus: getRuleExecutionStatusPending(lastRunTimestamp.toISOString()),
        monitoring: getDefaultMonitoringRuleDomainProperties(lastRunTimestamp.toISOString()),
        revision: 0,
        running: false,
      } as unknown as RuleDomain<Params>,
      params: {
        legacyId,
        paramsWithRefs: updatedParams,
      },
    });

    // Per-rule audit event matches createRuleSavedObject behaviour.
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: ruleAttributes.name },
      })
    );

    return {
      ruleId: id,
      rawRule: updateMeta(context, ruleAttributes),
      references,
    };
  } catch (error) {
    errors.push({
      message: error.message,
      status: error.output?.statusCode,
      rule: {
        id,
        name: input.data.name ?? 'n/a',
      },
    });
    return null;
  }
}
