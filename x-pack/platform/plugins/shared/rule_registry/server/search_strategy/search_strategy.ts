/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { map, mergeMap, catchError, of } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import { from } from 'rxjs';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import {
  ReadOperations,
  AlertingServerStart,
  AlertingAuthorizationEntity,
} from '@kbn/alerting-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { buildAlertFieldsRequest } from '@kbn/alerts-as-data-utils';
import { partition } from 'lodash';
import { isSiemRuleType } from '@kbn/rule-data-utils';
import { KbnSearchError } from '@kbn/data-plugin/server/search/report_search_error';
import type { RuleRegistrySearchRequest, RuleRegistrySearchResponse } from '../../common';
import { MAX_ALERT_SEARCH_SIZE } from '../../common/constants';
import { AlertAuditAction, alertAuditEvent } from '..';
import { getSpacesFilter, getAuthzFilter } from '../lib';
import { getRuleTypeIdsFilter } from '../lib/get_rule_type_ids_filter';
import { getConsumersFilter } from '../lib/get_consumers_filter';

export const EMPTY_RESPONSE: RuleRegistrySearchResponse = {
  rawResponse: {
    hits: { total: 0, hits: [] },
  } as unknown as RuleRegistrySearchResponse['rawResponse'],
};

export const RULE_SEARCH_STRATEGY_NAME = 'privateRuleRegistryAlertsSearchStrategy';

// these are deprecated types should never show up in any alert table
const EXCLUDED_RULE_TYPE_IDS = ['siem.notifications'];

export const ruleRegistrySearchStrategyProvider = (
  data: PluginStart,
  alerting: AlertingServerStart,
  logger: Logger,
  security?: SecurityPluginSetup,
  spaces?: SpacesPluginStart
): ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse> => {
  const internalUserEs = data.search.searchAsInternalUser;
  const requestUserEs = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      let params = {};

      // SIEM uses RBAC fields in their alerts but also utilizes ES DLS which
      // is different than every other solution so we need to special case
      // those requests.
      const isAnyRuleTypeESAuthorized = request.ruleTypeIds.some(isSiemRuleType);
      const isEachRuleTypeESAuthorized =
        // every returns true for empty arrays
        request.ruleTypeIds.length > 0 && request.ruleTypeIds.every(isSiemRuleType);

      const registeredRuleTypes = alerting.listTypes();

      const [validRuleTypeIds, invalidRuleTypeIds] = partition(request.ruleTypeIds, (ruleTypeId) =>
        registeredRuleTypes.has(ruleTypeId)
      );

      if (isAnyRuleTypeESAuthorized && !isEachRuleTypeESAuthorized) {
        throw new KbnSearchError(
          `The ${RULE_SEARCH_STRATEGY_NAME} search strategy is unable to accommodate requests containing multiple rule types with mixed authorization.`,
          400
        );
      }

      invalidRuleTypeIds.forEach((ruleTypeId) => {
        logger.warn(
          `Found invalid rule type '${ruleTypeId}' while using ${RULE_SEARCH_STRATEGY_NAME} search strategy. No alert data from this rule type will be searched.`
        );
      });

      const securityAuditLogger = security?.audit.asScoped(deps.request);
      const getActiveSpace = async () => spaces?.spacesService.getActiveSpace(deps.request);

      const getAsync = async (ruleTypeIds: string[]) => {
        const [space, authorization] = await Promise.all([
          getActiveSpace(),
          alerting.getAlertingAuthorizationWithRequest(deps.request),
        ]);

        let authzFilter;

        if (!isAnyRuleTypeESAuthorized && ruleTypeIds.length > 0) {
          authzFilter = (await getAuthzFilter(
            authorization,
            ReadOperations.Find
          )) as estypes.QueryDslQueryContainer;
        }

        const authorizedRuleTypes = await authorization.getAllAuthorizedRuleTypesFindOperation({
          authorizationEntity: AlertingAuthorizationEntity.Alert,
          ruleTypeIds,
        });

        return { space, authzFilter, authorizedRuleTypes };
      };
      return from(getAsync(validRuleTypeIds)).pipe(
        mergeMap(({ space, authzFilter, authorizedRuleTypes }) => {
          const authorizedRuleTypesIds = Array.from(authorizedRuleTypes.keys());
          const ruleTypes = (authorizedRuleTypesIds ?? []).filter(
            (ruleTypeId: string) => !EXCLUDED_RULE_TYPE_IDS.includes(ruleTypeId)
          );

          const indices = alerting.getAlertIndicesAlias(ruleTypes, space?.id);

          if (indices.length === 0) {
            return of(EMPTY_RESPONSE);
          }

          const filter = request.query?.bool?.filter
            ? Array.isArray(request.query?.bool?.filter)
              ? request.query?.bool?.filter
              : [request.query?.bool?.filter]
            : [];

          if (authzFilter) {
            filter.push(authzFilter);
          }

          if (space?.id) {
            filter.push(getSpacesFilter(space.id) as estypes.QueryDslQueryContainer);
          }

          const ruleTypeFilter = getRuleTypeIdsFilter(request.ruleTypeIds);
          const consumersFilter = getConsumersFilter(request.consumers);

          if (consumersFilter) {
            filter.push(consumersFilter);
          }

          if (ruleTypeFilter) {
            filter.push(ruleTypeFilter);
          }

          const sort = request.sort ?? [];

          const query = {
            ...(request.query?.ids != null
              ? { ids: request.query?.ids }
              : {
                  bool: {
                    ...request.query?.bool,
                    filter,
                  },
                }),
          };

          let fields = request?.fields ?? [];
          fields.push({ field: 'kibana.alert.*', include_unmapped: false });

          if (isAnyRuleTypeESAuthorized) {
            fields.push({ field: 'signal.*', include_unmapped: false });
            fields = fields.concat(buildAlertFieldsRequest([], false));
          } else {
            // only for o11y solutions
            fields.push({ field: '*', include_unmapped: true });
          }

          const size = request.pagination ? request.pagination.pageSize : MAX_ALERT_SEARCH_SIZE;
          params = {
            allow_no_indices: true,
            index: indices,
            ignore_unavailable: true,
            body: {
              _source: false,
              fields,
              sort,
              size,
              from: request.pagination ? request.pagination.pageIndex * size : 0,
              query,
              ...(request.runtimeMappings ? { runtime_mappings: request.runtimeMappings } : {}),
            },
          };
          return (isAnyRuleTypeESAuthorized ? requestUserEs : internalUserEs).search(
            { id: request.id, params },
            options,
            deps
          );
        }),
        map((response: RuleRegistrySearchResponse) => {
          // Do we have to loop over each hit? Yes.
          // ecs auditLogger requires that we log each alert independently
          if (securityAuditLogger != null) {
            response.rawResponse.hits?.hits?.forEach((hit) => {
              securityAuditLogger.log(
                alertAuditEvent({
                  action: AlertAuditAction.FIND,
                  id: hit._id,
                  outcome: 'success',
                })
              );
            });
          }

          try {
            response.inspect = { dsl: [JSON.stringify(params)] };
          } catch (error) {
            logger.error(`Failed to stringify rule registry search strategy params: ${error}`);
            response.inspect = { dsl: [] };
          }

          return response;
        }),
        catchError((err) => {
          if (securityAuditLogger != null && err?.output?.statusCode === 403) {
            securityAuditLogger.log(
              alertAuditEvent({
                action: AlertAuditAction.FIND,
                outcome: 'failure',
                error: err,
              })
            );
          }

          if (Boom.isBoom(err)) {
            throw new KbnSearchError(err.output.payload.message, err.output.statusCode);
          }

          if (err instanceof KbnSearchError) {
            throw err;
          }

          throw new KbnSearchError(err.message, 500);
        })
      );
    },
    cancel: async (id, options, deps) => {
      if (internalUserEs.cancel) internalUserEs.cancel(id, options, deps).catch(() => {});
      if (requestUserEs.cancel) requestUserEs.cancel(id, options, deps).catch(() => {});
    },
  };
};
