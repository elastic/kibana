/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import {
  buildConsumersFilter,
  buildRuleTypeIdsFilter,
  combineFilterWithAuthorizationFilter,
  combineFilters,
} from '../../../../rules_client/common/filters';
import { findRulesSo } from '../../../../data/rule';
import { AlertingAuthorizationEntity } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { buildKueryNodeFilter } from '../../../../rules_client/common';
import { alertingAuthorizationFilterOpts } from '../../../../rules_client/common/constants';
import { RulesClientContext } from '../../../../rules_client/types';
import { aggregateOptionsSchema } from './schemas';
import type { AggregateParams } from './types';
import { validateRuleAggregationFields } from './validation';

export async function aggregateRules<T = Record<string, unknown>>(
  context: RulesClientContext,
  params: AggregateParams<T>
): Promise<T> {
  const { options = {}, aggs } = params;
  const { filter, page = 1, perPage = 0, ruleTypeIds, consumers, ...restOptions } = options;

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter({
      authorizationEntity: AlertingAuthorizationEntity.Rule,
      filterOpts: alertingAuthorizationFilterOpts,
    });

    validateRuleAggregationFields(aggs);
    aggregateOptionsSchema.validate(options);
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.AGGREGATE,
        error,
      })
    );
    throw error;
  }

  const { filter: authorizationFilter } = authorizationTuple;
  const filterKueryNode = buildKueryNodeFilter(filter);
  const ruleTypeIdsFilter = buildRuleTypeIdsFilter(ruleTypeIds);
  const consumersFilter = buildConsumersFilter(consumers);
  const combinedFilters = combineFilters(
    [filterKueryNode, ruleTypeIdsFilter, consumersFilter],
    'and'
  );

  const { aggregations } = await findRulesSo<T>({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      ...restOptions,
      filter: combineFilterWithAuthorizationFilter(
        combinedFilters,
        authorizationFilter as KueryNode
      ),
      page,
      perPage,
      aggs,
    },
  });

  return aggregations!;
}
