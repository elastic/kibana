/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
import { KueryNode } from '@kbn/es-query';
import { withSpan } from '@kbn/apm-utils';
import { RawRule } from '../../types';
import { WriteOperations, ReadOperations, AlertingAuthorizationEntity } from '../../authorization';
import { BulkAction, RuleBulkOperationAggregation } from '../types';
import {
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
  RULE_TYPE_CHECKS_CONCURRENCY,
} from '../common/constants';
import { RulesClientContext } from '../types';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export const checkAuthorizationAndGetTotal = async (
  context: RulesClientContext,
  {
    filter,
    action,
  }: {
    filter: KueryNode | null;
    action: BulkAction;
  }
) => {
  const actionToConstantsMapping: Record<
    BulkAction,
    { WriteOperation: WriteOperations | ReadOperations; RuleAuditAction: RuleAuditAction }
  > = {
    DELETE: {
      WriteOperation: WriteOperations.BulkDelete,
      RuleAuditAction: RuleAuditAction.DELETE,
    },
    ENABLE: {
      WriteOperation: WriteOperations.BulkEnable,
      RuleAuditAction: RuleAuditAction.ENABLE,
    },
    DISABLE: {
      WriteOperation: WriteOperations.BulkDisable,
      RuleAuditAction: RuleAuditAction.DISABLE,
    },
  };

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

  if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
    throw Boom.badRequest(
      `More than ${MAX_RULES_NUMBER_FOR_BULK_OPERATION} rules matched for bulk ${action.toLocaleLowerCase()}`
    );
  }

  const buckets = aggregations?.alertTypeId.buckets;

  if (buckets === undefined || buckets?.length === 0) {
    throw Boom.badRequest(`No rules found for bulk ${action.toLocaleLowerCase()}`);
  }

  await withSpan({ name: 'authorization.ensureAuthorized', type: 'rules' }, () =>
    pMap(
      buckets,
      async ({ key: [ruleType, consumer] }) => {
        context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType);
        try {
          await context.authorization.ensureAuthorized({
            ruleTypeId: ruleType,
            consumer,
            operation: actionToConstantsMapping[action].WriteOperation,
            entity: AlertingAuthorizationEntity.Rule,
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
      },
      { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
    )
  );
  return { total };
};
