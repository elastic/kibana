/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRulesStatusesSchema } from '../schemas/find_rules_statuses_schema';
import {
  FindRulesStatusesRequestParams,
  IRuleSavedAttributesSavedObjectAttributes,
  RuleStatusResponse,
  IRuleStatusAttributes,
} from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import {
  buildRouteValidation,
  transformError,
  convertToSnakeCase,
  buildSiemResponse,
} from '../utils';

export const findRulesStatusesRoute = (router: IRouter) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_find_statuses`,
      validate: {
        query: buildRouteValidation<FindRulesStatusesRequestParams>(findRulesStatusesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { query } = request;
      const alertsClient = context.alerting.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemResponse = buildSiemResponse(response);

      if (!alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      // build return object with ids as keys and errors as values.
      /* looks like this
        {
            "someAlertId": [{"myerrorobject": "some error value"}, etc..],
            "anotherAlertId": ...
        }
    */
      try {
        const statuses = await query.ids.reduce<Promise<RuleStatusResponse | {}>>(
          async (acc, id) => {
            const lastFiveErrorsForId = await savedObjectsClient.find<
              IRuleSavedAttributesSavedObjectAttributes
            >({
              type: ruleStatusSavedObjectType,
              perPage: 6,
              sortField: 'statusDate',
              sortOrder: 'desc',
              search: id,
              searchFields: ['alertId'],
            });
            const accumulated = await acc;

            // Array accessors can result in undefined but
            // this is not represented in typescript for some reason,
            // https://github.com/Microsoft/TypeScript/issues/11122
            const currentStatus = convertToSnakeCase<IRuleStatusAttributes>(
              lastFiveErrorsForId.saved_objects[0]?.attributes
            );
            const failures = lastFiveErrorsForId.saved_objects
              .slice(1)
              .map(errorItem => convertToSnakeCase<IRuleStatusAttributes>(errorItem.attributes));
            return {
              ...accumulated,
              [id]: {
                current_status: currentStatus,
                failures,
              },
            };
          },
          Promise.resolve<RuleStatusResponse>({})
        );
        return response.ok({ body: statuses });
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
