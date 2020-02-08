/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { LegacyServices, LegacyRequest } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { findRules } from '../../rules/find_rules';
import { FindRulesRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { findRulesSchema } from '../schemas/find_rules_schema';
import { transformFindAlertsOrError } from './utils';
import { transformError } from '../utils';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const createFindRulesRoute = (getClients: GetScopedClients): Hapi.ServerRoute => {
  return {
    method: 'GET',
    path: `${DETECTION_ENGINE_RULES_URL}/_find`,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        query: findRulesSchema,
      },
    },
    async handler(request: FindRulesRequest & LegacyRequest, headers) {
      const { query } = request;
      try {
        const { alertsClient, savedObjectsClient } = await getClients(request);
        if (!alertsClient) {
          return headers.response().code(404);
        }

        const rules = await findRules({
          alertsClient,
          perPage: query.per_page,
          page: query.page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
          filter: query.filter,
        });
        const ruleStatuses = await Promise.all(
          rules.data.map(async rule => {
            const results = await savedObjectsClient.find<
              IRuleSavedAttributesSavedObjectAttributes
            >({
              type: ruleStatusSavedObjectType,
              perPage: 1,
              sortField: 'statusDate',
              sortOrder: 'desc',
              search: rule.id,
              searchFields: ['alertId'],
            });
            return results;
          })
        );
        return transformFindAlertsOrError(rules, ruleStatuses);
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const findRulesRoute = (route: LegacyServices['route'], getClients: GetScopedClients) => {
  route(createFindRulesRoute(getClients));
};
