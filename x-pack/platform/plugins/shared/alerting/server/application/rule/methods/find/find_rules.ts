/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pick } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { getKqlFieldNames, type KueryNode } from '@kbn/es-query';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { includedFields } from '@kbn/core-saved-objects-api-server-internal/src/lib/utils';
import {
  getSearchDsl,
  validateConvertFilterToKueryNode,
} from '@kbn/core-saved-objects-api-server-internal/src/lib/search';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import {
  DEFAULT_NAMESPACE_STRING,
  FIND_DEFAULT_PAGE,
  FIND_DEFAULT_PER_PAGE,
} from '@kbn/core-saved-objects-utils-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsSearchOptions } from '@kbn/core-saved-objects-api-server';
import type {
  MappingPropertyBase,
  MappingRuntimeFields,
} from '@elastic/elasticsearch/lib/api/types';
import { searchRulesSo } from '../../../../data/rule/methods/search_rules_so';
import {
  buildConsumersFilter,
  buildRuleTypeIdsFilter,
  combineFilterWithAuthorizationFilter,
  combineFilters,
} from '../../../../rules_client/common/filters';
import { AlertingAuthorizationEntity } from '../../../../authorization/types';
import type { SanitizedRule, Rule as DeprecatedRule, RawRule } from '../../../../types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  mapSortField,
  validateOperationOnAttributes,
  buildKueryNodeFilter,
  includeFieldsRequiredForAuthentication,
} from '../../../../rules_client/common';
import {
  getModifiedField,
  getModifiedSearchFields,
  getModifiedSearch,
  modifyFilterKueryNode,
} from '../../../../rules_client/common/mapped_params_utils';
import { alertingAuthorizationFilterOpts } from '../../../../rules_client/common/constants';
import type { RulesClientContext } from '../../../../rules_client/types';
import { formatLegacyActions, getAlertFromRaw } from '../../../../rules_client/lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { FindRulesParams } from './types';
import { findRulesParamsSchema } from './schemas';
import type { Rule, RuleParams } from '../../types';

export interface FindResult<Params extends RuleParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedRule<Params>>;
}

export async function findRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params?: FindRulesParams
): Promise<FindResult<Params>> {
  const { options, excludeFromPublicApi = false, includeSnoozeData = false } = params || {};

  const { fields, ruleTypeIds, consumers, ...findOptions } = options || {};

  const { savedObjectsTypeRegistry: registry, savedObjectsSerializer: serializer } = context;
  const { mappings } = context.internalSavedObjectsRepository as unknown as {
    mappings: IndexMapping;
  };

  try {
    if (params) {
      findRulesParamsSchema.validate(params);
    }
  } catch (error) {
    throw Boom.badRequest(`Error validating find data - ${error.message}`);
  }

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter({
      authorizationEntity: AlertingAuthorizationEntity.Rule,
      filterOpts: alertingAuthorizationFilterOpts,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND,
        error,
      })
    );
    throw error;
  }

  const { filter: authorizationFilter, ensureRuleTypeIsAuthorized } = authorizationTuple;
  const filterKueryNode = buildKueryNodeFilter(findOptions.filter as string | KueryNode);
  let sortField = mapSortField(findOptions.sortField);

  if (excludeFromPublicApi) {
    try {
      validateOperationOnAttributes(
        filterKueryNode,
        sortField,
        findOptions.searchFields,
        context.fieldsToExcludeFromPublicApi
      );
    } catch (error) {
      throw Boom.badRequest(`Error find rules: ${error.message}`);
    }
  }

  sortField = mapSortField(getModifiedField(findOptions.sortField));

  // Modifies kuery node AST to translate params filter and the filter value to mapped_params.
  // This translation is done in place, and therefore is not a pure function.
  if (filterKueryNode) {
    modifyFilterKueryNode({ astFilter: filterKueryNode });
  }

  const ruleTypeIdsFilter = buildRuleTypeIdsFilter(ruleTypeIds);
  const consumersFilter = buildConsumersFilter(consumers);
  const combinedFilters = combineFilters(
    [filterKueryNode, ruleTypeIdsFilter, consumersFilter],
    'and'
  );

  const finalFilter = combineFilterWithAuthorizationFilter(
    combinedFilters,
    authorizationFilter as KueryNode
  );

  const actionParamFilterFields = finalFilter
    ? Array.from(new Set(getKqlFieldNames(finalFilter)))
    : [];
  const runtimeMappings: MappingRuntimeFields = {};

  actionParamFilterFields.forEach((field) => {
    // If there is any `alert.attributes.actions.params.{PARAM_NAME}` field in the filter,
    // we need to add a runtime mapping for it to be able to filter on it
    if (field.startsWith('alert.attributes.actions.params.')) {
      const actionParamField = field.replace('alert.attributes.actions.params.', '');
      // We're not including `.attributes.` in the runtime field path to match the field name
      // used in the final query
      runtimeMappings[`alert.actions.params.${actionParamField}`] = {
        type: 'keyword',
        script: {
          source: `
            if (params._source.alert?.actions != null) {
              for (def action : params._source.alert.actions) {
                if (action?.params?.${actionParamField} != null) {
                  for (def field : action.params.${actionParamField}) {
                    if (field != null) {
                      emit(field);
                    }
                  }
                }
              }
            }
          `,
        },
      };
      const ruleActionsMapping = mappings.properties.alert.properties
        ?.actions as MappingPropertyBase;
      if (ruleActionsMapping?.properties) {
        // Add it to the mappings too, so that `validateConvertFilterToKueryNode` recognizes it
        set(
          ruleActionsMapping.properties,
          ['params', ...actionParamField.split('.')].join('.properties.'),
          {
            type: 'keyword',
          }
        );
      }
    }
  });

  const {
    page = FIND_DEFAULT_PAGE,
    perPage = FIND_DEFAULT_PER_PAGE,
    search,
    defaultSearchOperator,
    searchFields,
    sortOrder,
    hasReference,
  } = findOptions;

  let kueryNode;
  if (finalFilter) {
    try {
      kueryNode = validateConvertFilterToKueryNode([RULE_SAVED_OBJECT_TYPE], finalFilter, mappings);
    } catch (e) {
      if (e.name === 'KQLSyntaxError') {
        throw SavedObjectsErrorHelpers.createBadRequestError(`KQLSyntaxError: ${e.message}`);
      } else {
        throw e;
      }
    }
  }

  const searchOptions: Omit<SavedObjectsSearchOptions, 'type'> = {
    from: perPage != null && page != null ? perPage * (page - 1) : undefined,
    size: perPage != null ? perPage : undefined,
    _source: includedFields(
      RULE_SAVED_OBJECT_TYPE,
      fields ? includeFieldsRequiredForAuthentication(fields) : fields
    ),
    rest_total_hits_as_int: true,
    seq_no_primary_term: true,
    namespaces: [DEFAULT_NAMESPACE_STRING],
    ...getSearchDsl(mappings, registry, {
      // Generate new modified search and search fields, translating certain params properties
      // to mapped_params. Thus, allowing for sort/search/filtering on params.
      // We do the modifcation after the validate check to make sure the public API does not
      // use the mapped_params in their queries.
      searchFields: searchFields ? getModifiedSearchFields(searchFields) : undefined,
      search: search ? getModifiedSearch(searchFields, search) : undefined,
      defaultSearchOperator,
      type: RULE_SAVED_OBJECT_TYPE,
      sortField,
      sortOrder,
      hasReference,
      kueryNode,
    }),
    runtime_mappings: runtimeMappings,
  };

  const { hits } = await searchRulesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsSearchOptions: searchOptions,
  });

  // This is guaranteed to be a number because we set `rest_total_hits_as_int: true` in the search options
  const total = hits.total as number;
  const data = hits.hits.map((hit) =>
    serializer.rawToSavedObject<RawRule>(hit as SavedObjectsRawDoc)
  );

  const siemRules: Rule[] = [];

  const authorizedData = data.map(({ id, attributes, references }) => {
    try {
      ensureRuleTypeIsAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        AlertingAuthorizationEntity.Rule
      );
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FIND,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
          error,
        })
      );
      throw error;
    }

    const rule = getAlertFromRaw<Params>({
      excludeFromPublicApi,
      id,
      includeLegacyId: false,
      includeSnoozeData,
      isSystemAction: context.isSystemAction,
      logger: context.logger,
      rawRule: (fields ? pick(attributes, fields) : attributes) as RawRule,
      references,
      ruleTypeId: attributes.alertTypeId,
      ruleTypeRegistry: context.ruleTypeRegistry,
    });

    // collect SIEM rule for further formatting legacy actions
    if (attributes.consumer === AlertConsumers.SIEM) {
      siemRules.push(rule as Rule);
    }

    return rule;
  });

  authorizedData.forEach(({ id, name }) =>
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
      })
    )
  );

  // format legacy actions for SIEM rules, if there any
  if (siemRules.length) {
    const formattedRules = await formatLegacyActions(siemRules as DeprecatedRule[], {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    const formattedRulesMap = formattedRules.reduce<Record<string, DeprecatedRule>>((acc, rule) => {
      acc[rule.id] = rule;
      return acc;
    }, {});

    return {
      page,
      perPage,
      total,
      // replace siem formatted rules
      data: authorizedData.map((rule) => formattedRulesMap[rule.id] ?? rule),
    };
  }

  return {
    page,
    perPage,
    total,
    data: authorizedData as Array<SanitizedRule<Params>>,
  };
}
