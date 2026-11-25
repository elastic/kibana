/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { withSpan } from '@kbn/apm-utils';
import type { RawRule } from '../../types';
import { ReadOperations } from '../../authorization';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import type { BulkAction, RuleBulkOperationAggregation } from '../types';
import { MAX_RULES_NUMBER_FOR_BULK_OPERATION } from '../common/constants';
import type { RulesClientContext } from '../types';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { RulesNotFoundError } from './rules_not_found_error';
import { RulesNotVisibleError } from './rules_not_visible_error';

const actionToConstantsMapping: Record<
  BulkAction,
  {
    WriteOperation: WriteOperations | ReadOperations;
    RuleAuditAction: RuleAuditAction;
    errorMessageLabel: string;
  }
> = {
  DELETE: {
    WriteOperation: WriteOperations.BulkDelete,
    RuleAuditAction: RuleAuditAction.DELETE,
    errorMessageLabel: 'delete',
  },
  ENABLE: {
    WriteOperation: WriteOperations.BulkEnable,
    RuleAuditAction: RuleAuditAction.ENABLE,
    errorMessageLabel: 'enable',
  },
  DISABLE: {
    WriteOperation: WriteOperations.BulkDisable,
    RuleAuditAction: RuleAuditAction.DISABLE,
    errorMessageLabel: 'disable',
  },
  GET: {
    WriteOperation: ReadOperations.BulkGet,
    RuleAuditAction: RuleAuditAction.BULK_GET,
    errorMessageLabel: 'get',
  },
  BULK_EDIT: {
    WriteOperation: WriteOperations.BulkEdit,
    RuleAuditAction: RuleAuditAction.BULK_EDIT,
    errorMessageLabel: 'edit',
  },
  BULK_EDIT_PARAMS: {
    WriteOperation: ReadOperations.BulkEditParams,
    RuleAuditAction: RuleAuditAction.BULK_EDIT_PARAMS,
    errorMessageLabel: 'edit params',
  },
};

export const checkAuthorizationAndGetTotal = async (
  context: RulesClientContext,
  {
    filter,
    baseFilter,
    action,
  }: {
    filter: KueryNode | null;
    /**
     * The caller's query/ids filter before authorization is applied. When provided and the
     * first count returns zero, a second count is run with baseFilter alone (no auth clause).
     * Zero → rules genuinely don't exist → RulesNotFoundError.
     * Non-zero → rules exist but hidden by auth → RulesNotVisibleError.
     * Omitting baseFilter skips the second count; throws RulesNotFoundError without discrimination.
     */
    baseFilter?: KueryNode | null;
    action: BulkAction;
  }
) => {
  const { aggregations, total } = await withSpan(
    { name: 'unsecuredSavedObjectsClient.find', type: 'rules' },
    () =>
      context.unsecuredSavedObjectsClient.find<RawRule, RuleBulkOperationAggregation>({
        filter,
        page: 1,
        perPage: 0,
        type: RULE_SAVED_OBJECT_TYPE,
        aggs: {
          alertTypeId: {
            multi_terms: {
              terms: [
                { field: 'alert.attributes.alertTypeId' },
                { field: 'alert.attributes.consumer' },
              ],
            },
          },
        },
      })
  );

  const { errorMessageLabel } = actionToConstantsMapping[action];

  if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
    throw Boom.badRequest(
      `More than ${MAX_RULES_NUMBER_FOR_BULK_OPERATION} rules matched for bulk ${errorMessageLabel}`
    );
  }

  const buckets = aggregations?.alertTypeId.buckets ?? [];

  if (buckets?.length === 0) {
    if (baseFilter == null) {
      throw Boom.boomify(new RulesNotFoundError(errorMessageLabel), { statusCode: 400 });
    }

    const { total: totalWithoutAuth } = await withSpan(
      { name: 'unsecuredSavedObjectsClient.find.baseFilter', type: 'rules' },
      () =>
        context.unsecuredSavedObjectsClient.find<RawRule>({
          filter: baseFilter,
          page: 1,
          perPage: 0,
          type: RULE_SAVED_OBJECT_TYPE,
        })
    );

    const error =
      totalWithoutAuth === 0
        ? new RulesNotFoundError(errorMessageLabel)
        : new RulesNotVisibleError(errorMessageLabel);

    throw Boom.boomify(error, { statusCode: 400 });
  }

  const ruleTypeIdConsumersPairs = buckets.map(({ key: [ruleTypeId, consumer] }) => ({
    ruleTypeId,
    consumers: [consumer],
  }));

  const uniqueRuleTypeIds = [...new Set(ruleTypeIdConsumersPairs.map((p) => p.ruleTypeId))];
  for (const ruleTypeId of uniqueRuleTypeIds) {
    context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleTypeId);
  }

  const operation = actionToConstantsMapping[action].WriteOperation;
  const entity = AlertingAuthorizationEntity.Rule;

  await withSpan({ name: 'authorization.bulkEnsureAuthorized', type: 'rules' }, async () => {
    try {
      await context.authorization.bulkEnsureAuthorized({
        ruleTypeIdConsumersPairs,
        operation,
        entity,
      });
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: actionToConstantsMapping[action].RuleAuditAction,
          error,
        })
      );
      throw error;
    }
  });

  return { total };
};
