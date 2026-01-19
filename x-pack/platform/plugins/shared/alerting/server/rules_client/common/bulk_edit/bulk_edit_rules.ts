/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import type { RuleParams } from '../../../application/rule/types';
import type { RuleBulkOperationAggregation, RulesClientContext } from '../../types';
import { ruleAuditEvent, type RuleAuditAction } from '../audit_events';
import {
  AlertingAuthorizationEntity,
  type ReadOperations,
  type WriteOperations,
} from '../../../authorization';
import type { RawRule, SanitizedRule } from '../../../types';
import { buildKueryNodeFilter } from '../build_kuery_node_filter';
import { convertRuleIdsToKueryNode } from '../../../lib';
import {
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
  RULE_TYPE_CHECKS_CONCURRENCY,
  alertingAuthorizationFilterOpts,
} from '../constants';
import { findRulesSo } from '../../../data/rule';
import { retryIfBulkEditConflicts } from './retry_if_bulk_edit_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleDomainSchema } from '../../../application/rule/schemas';
import type { RuleDomain } from '../../../application/rule/types';
import {
  transformRuleAttributesToRuleDomain,
  transformRuleDomainToRule,
} from '../../../application/rule/transforms';
import { bulkEditRulesOcc } from './bulk_edit_rules_occ';
import type {
  BulkEditResult,
  ParamsModifier,
  ShouldIncrementRevision,
  UpdateOperationOpts,
} from './types';
import {
  combineFiltersWithInternalRuleTypeFilter,
  constructIgnoreInternalRuleTypesFilter,
} from '../construct_ignore_internal_rule_type_filters';

export interface BulkEditOptions<Params extends RuleParams> {
  filter?: string | KueryNode;
  ids?: string[];
  name: string;
  updateFn: (opts: UpdateOperationOpts) => Promise<void>;
  auditAction: RuleAuditAction;
  shouldValidateSchedule?: boolean;
  shouldInvalidateApiKeys: boolean;
  requiredAuthOperation: ReadOperations | WriteOperations;
  paramsModifier?: ParamsModifier<Params>;
  shouldIncrementRevision?: ShouldIncrementRevision<Params>;
  ignoreInternalRuleTypes?: boolean;
}

export async function bulkEditRules<Params extends RuleParams>(
  context: RulesClientContext,
  options: BulkEditOptions<Params>
): Promise<BulkEditResult<Params>> {
  const queryFilter = options.filter;
  const ids = options.ids;
  const ignoreInternalRuleTypes = options.ignoreInternalRuleTypes ?? true;

  const actionsClient = await context.getActionsClient();

  if (ids && queryFilter) {
    throw Boom.badRequest(
      "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
    );
  }

  const qNodeQueryFilter = buildKueryNodeFilter(queryFilter);
  const qNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : qNodeQueryFilter;
  const internalRuleTypeFilter = constructIgnoreInternalRuleTypesFilter({
    ruleTypes: context.ruleTypeRegistry.list(),
  });

  let authorizationTuple;

  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter({
      authorizationEntity: AlertingAuthorizationEntity.Rule,
      filterOpts: alertingAuthorizationFilterOpts,
    });
  } catch (error) {
    context.auditLogger?.log(ruleAuditEvent({ action: options.auditAction, error }));
    throw error;
  }
  const { filter: authorizationFilter } = authorizationTuple;

  const qNodeFilterWithAuth =
    authorizationFilter && qNodeFilter
      ? nodeBuilder.and([qNodeFilter, authorizationFilter as KueryNode])
      : qNodeFilter;

  const finalFilter = ignoreInternalRuleTypes
    ? combineFiltersWithInternalRuleTypeFilter({
        filter: qNodeFilterWithAuth,
        internalRuleTypeFilter,
      })
    : qNodeFilterWithAuth;

  const { aggregations, total } = await findRulesSo<RuleBulkOperationAggregation>({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      filter: finalFilter,
      page: 1,
      perPage: 0,
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
    },
  });

  if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
    throw Boom.badRequest(
      `More than ${MAX_RULES_NUMBER_FOR_BULK_OPERATION} rules matched for bulk edit`
    );
  }
  const buckets = aggregations?.alertTypeId.buckets;

  if (buckets === undefined) {
    throw Error('No rules found for bulk edit');
  }

  await pMap(
    buckets,
    async ({ key: [ruleType, consumer] }) => {
      context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType);

      try {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType,
          consumer,
          operation: options.requiredAuthOperation,
          entity: AlertingAuthorizationEntity.Rule,
        });
      } catch (error) {
        context.auditLogger?.log(ruleAuditEvent({ action: options.auditAction, error }));
        throw error;
      }
    },
    { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
  );

  const { apiKeysToInvalidate, results, errors, skipped } = await retryIfBulkEditConflicts(
    context.logger,
    options.name,
    (filterKueryNode: KueryNode | null) =>
      bulkEditRulesOcc(context, {
        filter: filterKueryNode,
        shouldValidateSchedule: options.shouldValidateSchedule,
        shouldInvalidateApiKeys: options.shouldInvalidateApiKeys,
        updateFn: options.updateFn,
        paramsModifier: options.paramsModifier,
        shouldIncrementRevision: options.shouldIncrementRevision,
      }),
    finalFilter
  );

  if (apiKeysToInvalidate.length > 0) {
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: apiKeysToInvalidate },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
  }

  const updatedRules = results.map(({ id, attributes, references }) => {
    // TODO (http-versioning): alertTypeId should never be null, but we need to
    // fix the type cast from SavedObjectsBulkUpdateObject to SavedObjectsBulkUpdateObject
    // when we are doing the bulk create and this should fix itself
    const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId!);
    const ruleDomain = transformRuleAttributesToRuleDomain<Params>(
      attributes as RawRule,
      {
        id,
        logger: context.logger,
        ruleType,
        references,
        omitGeneratedValues: false,
      },
      (connectorId: string) => actionsClient.isSystemAction(connectorId)
    );
    try {
      ruleDomainSchema.validate(ruleDomain);
    } catch (e) {
      context.logger.warn(`Error validating bulk edited rule domain object for id: ${id}, ${e}`);
    }
    return ruleDomain;
  });

  // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
  const publicRules = updatedRules.map((rule: RuleDomain<Params>) => {
    return transformRuleDomainToRule<Params>(rule);
  }) as Array<SanitizedRule<Params>>;

  return { rules: publicRules, skipped, errors, total };
}
