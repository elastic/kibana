/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import type { RulesClientContext } from '../../../../rules_client/types';
import { findRuleTemplatesSo } from '../../../../data/rule_template';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { FindRuleTemplatesParams } from './types';
import { findRuleTemplatesParamsSchema } from './schema';
import { transformRawRuleTemplateToRuleTemplate } from '../../transforms/transform_raw_rule_template_to_rule_template';
import type { RuleTemplate } from '../../types';
import {
  buildRuleTypeIdsFilter,
  buildTagsFilter,
  combineFilters,
  combineFilterWithAuthorizationFilter,
} from '../../../../rules_client/common/filters';
import { mapSortField } from '../../../../rules_client/common';
import { AlertingAuthorizationEntity } from '../../../../authorization';
import { ensureFieldIsSafeForQuery } from '../../../../authorization/alerting_authorization_kuery';

export interface FindResult {
  page: number;
  perPage: number;
  total: number;
  data: Array<RuleTemplate>;
}

export async function findRuleTemplates(
  context: RulesClientContext,
  params: FindRuleTemplatesParams
): Promise<FindResult> {
  try {
    findRuleTemplatesParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating find template data - ${error.message}`);
  }

  // we follow the same auth patterns as in the find rules API, however the implementation is slightly
  // different because rule templates do not have consumers. If the user has access to a rule type for
  // at least one consumer, then all the templates of that rule type should be returned.
  const authorizedRuleTypes = await context.authorization.getAllAuthorizedRuleTypesFindOperation({
    authorizationEntity: AlertingAuthorizationEntity.Rule,
  });

  // user has no access to any rule types
  if (!authorizedRuleTypes.size) {
    throw Boom.forbidden(
      `Unauthorized to find ${AlertingAuthorizationEntity.Rule}s for any rule types`
    );
  }

  // build the filter which applies the rule type constraints for the authorized user.
  const authorizedRuleTypeIds = Array.from(authorizedRuleTypes.keys());
  const authorizationFilter = nodeBuilder.or(
    authorizedRuleTypeIds.map((ruleTypeId) => {
      ensureFieldIsSafeForQuery('ruleTypeId', ruleTypeId);
      return nodeBuilder.is(`${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.ruleTypeId`, ruleTypeId);
    })
  );

  const { ruleTypeId, tags, perPage, page, search, defaultSearchOperator, sortField, sortOrder } =
    params;

  const ruleTypeFilter = ruleTypeId
    ? buildRuleTypeIdsFilter([ruleTypeId], RULE_TEMPLATE_SAVED_OBJECT_TYPE)
    : undefined;
  const tagsFilter = tags ? buildTagsFilter(tags, RULE_TEMPLATE_SAVED_OBJECT_TYPE) : undefined;
  const combinedFilters = combineFilters([ruleTypeFilter, tagsFilter], 'and');

  const finalFilter = combineFilterWithAuthorizationFilter(
    combinedFilters,
    authorizationFilter as KueryNode
  );

  // aside from rule type, these are the only mapped fields.
  // it doesn't make much sense to expose a param to customize this yet.
  // we should add 'description' here when it's available.
  const searchFields = ['name', 'tags', 'description'];

  const {
    page: resultPage,
    per_page: resultPerPage,
    total,
    saved_objects: data,
  } = await findRuleTemplatesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      page,
      perPage,
      search,
      searchFields,
      defaultSearchOperator,
      sortField: mapSortField(sortField),
      sortOrder,
      filter: finalFilter,
    },
  });

  // this is a second layer of defence which validates the auth filter was applied correctly
  const ensureRuleTypeIsAuthorized = (returnedRuleTypeId: string) => {
    if (!authorizedRuleTypes.has(returnedRuleTypeId)) {
      throw Boom.forbidden(
        `Unauthorized to find ${AlertingAuthorizationEntity.Rule} for rule type "${returnedRuleTypeId}"`
      );
    }
  };
  const authorizedData = data.map((so) => {
    ensureRuleTypeIsAuthorized(so.attributes.ruleTypeId);
    return so;
  });

  const transformedData = authorizedData.map((so) =>
    transformRawRuleTemplateToRuleTemplate({
      id: so.id,
      attributes: so.attributes,
    })
  );

  return {
    page: resultPage,
    perPage: resultPerPage,
    total,
    data: transformedData,
  };
}
