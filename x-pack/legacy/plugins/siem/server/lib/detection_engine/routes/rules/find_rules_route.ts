/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRules } from '../../rules/find_rules';
import {
  FindRulesRequestParams,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { findRulesSchema } from '../schemas/find_rules_schema';
import { transformValidateFindAlerts } from './validate';
import { buildRouteValidation, transformError, buildSiemResponse } from '../utils';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const findRulesRoute = (router: IRouter) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_find`,
      validate: {
        query: buildRouteValidation<FindRulesRequestParams>(findRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const { query } = request;
        const alertsClient = context.alerting.getAlertsClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
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
        const [validated, errors] = transformValidateFindAlerts(rules, ruleStatuses);
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
