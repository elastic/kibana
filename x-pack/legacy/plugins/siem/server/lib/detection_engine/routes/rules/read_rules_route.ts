/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdError, transformOrError } from './utils';
import { transformError } from '../utils';

import { readRules } from '../../rules/read_rules';
import { LegacySetupServices, RequestFacade } from '../../../../plugin';
import { queryRulesSchema } from '../schemas/query_rules_schema';
import { QueryRequest, IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { LegacyGetScopedServices } from '../../../../services';

export const createReadRulesRoute = (getServices: LegacyGetScopedServices): Hapi.ServerRoute => ({
  method: 'GET',
  path: DETECTION_ENGINE_RULES_URL,
  options: {
    tags: ['access:siem'],
    validate: {
      options: {
        abortEarly: false,
      },
      query: queryRulesSchema,
    },
  },
  async handler(request: QueryRequest & RequestFacade, headers) {
    const { id, rule_id: ruleId } = request.query;

    try {
      const { alertsClient, savedObjectsClient } = await getServices(request);
      if (!alertsClient || !savedObjectsClient) {
        return headers.response().code(404);
      }

      const rule = await readRules({
        alertsClient,
        id,
        ruleId,
      });
      if (rule != null) {
        const ruleStatuses = await savedObjectsClient.find<
          IRuleSavedAttributesSavedObjectAttributes
        >({
          type: ruleStatusSavedObjectType,
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: rule.id,
          searchFields: ['alertId'],
        });
        return transformOrError(rule, ruleStatuses.saved_objects[0]);
      } else {
        return getIdError({ id, ruleId });
      }
    } catch (err) {
      return transformError(err);
    }
  },
});

export const readRulesRoute = (
  route: LegacySetupServices['route'],
  getServices: LegacyGetScopedServices
) => {
  route(createReadRulesRoute(getServices));
};
