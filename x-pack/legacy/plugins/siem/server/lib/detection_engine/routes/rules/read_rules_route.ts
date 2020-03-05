/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { buildRouteValidation, transformError, buildSiemResponse } from '../utils';
import { readRules } from '../../rules/read_rules';
import { queryRulesSchema } from '../schemas/query_rules_schema';
import {
  ReadRuleRequestParams,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const readRulesRoute = (router: IRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation<ReadRuleRequestParams>(queryRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { id, rule_id: ruleId } = request.query;
      const alertsClient = context.alerting.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemResponse = buildSiemResponse(response);

      try {
        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
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
