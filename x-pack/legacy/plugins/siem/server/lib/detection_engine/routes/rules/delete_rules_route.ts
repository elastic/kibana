/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { deleteRules } from '../../rules/delete_rules';
import { queryRulesSchema } from '../schemas/query_rules_schema';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { buildRouteValidation, transformError, buildSiemResponse } from '../utils';
import {
  DeleteRuleRequestParams,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const deleteRulesRoute = (router: IRouter) => {
  router.delete(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation<DeleteRuleRequestParams>(queryRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const { id, rule_id: ruleId } = request.query;

        const alertsClient = context.alerting.getAlertsClient();
        const actionsClient = context.actions.getActionsClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!actionsClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const rule = await deleteRules({
          actionsClient,
          alertsClient,
          id,
          ruleId,
        });
        if (rule != null) {
          const ruleStatuses = await savedObjectsClient.find<
            IRuleSavedAttributesSavedObjectAttributes
          >({
            type: ruleStatusSavedObjectType,
            perPage: 6,
            search: rule.id,
            searchFields: ['alertId'],
          });
          ruleStatuses.saved_objects.forEach(async obj =>
            savedObjectsClient.delete(ruleStatusSavedObjectType, obj.id)
          );
          const [validated, errors] = transformValidate(rule, ruleStatuses.saved_objects[0]);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id, ruleId });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
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
