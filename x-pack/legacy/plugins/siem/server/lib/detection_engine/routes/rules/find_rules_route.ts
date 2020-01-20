/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRules } from '../../rules/find_rules';
import { FindRulesRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { findRulesSchema } from '../schemas/find_rules_schema';
import { ServerFacade } from '../../../../types';
import { transformFindAlertsOrError } from './utils';
import { transformError } from '../utils';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const createFindRulesRoute: Hapi.ServerRoute = {
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
  async handler(request: FindRulesRequest, headers) {
    const { query } = request;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;
    const savedObjectsClient = isFunction(request.getSavedObjectsClient)
      ? request.getSavedObjectsClient()
      : null;
    if (!alertsClient || !actionsClient || !savedObjectsClient) {
      return headers.response().code(404);
    }

    try {
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
          const results = await savedObjectsClient.find<IRuleSavedAttributesSavedObjectAttributes>({
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

export const findRulesRoute = (server: ServerFacade) => {
  server.route(createFindRulesRoute);
};
