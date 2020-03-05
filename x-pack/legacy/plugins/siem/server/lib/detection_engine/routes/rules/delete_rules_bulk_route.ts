/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RouteConfig, RequestHandler } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { queryRulesBulkSchema } from '../schemas/query_rules_bulk_schema';
import { rulesBulkSchema } from '../schemas/response/rules_bulk_schema';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { transformBulkError, buildRouteValidation, buildSiemResponse } from '../utils';
import {
  IRuleSavedAttributesSavedObjectAttributes,
  DeleteRulesRequestParams,
} from '../../rules/types';
import { deleteRules } from '../../rules/delete_rules';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

type Config = RouteConfig<unknown, unknown, DeleteRulesRequestParams, 'delete' | 'post'>;
type Handler = RequestHandler<unknown, unknown, DeleteRulesRequestParams, 'delete' | 'post'>;

export const deleteRulesBulkRoute = (router: IRouter) => {
  const config: Config = {
    validate: {
      body: buildRouteValidation<DeleteRulesRequestParams>(queryRulesBulkSchema),
    },
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    options: {
      tags: ['access:siem'],
    },
  };
  const handler: Handler = async (context, request, response) => {
    const alertsClient = context.alerting.getAlertsClient();
    const actionsClient = context.actions.getActionsClient();
    const savedObjectsClient = context.core.savedObjects.client;
    const siemResponse = buildSiemResponse(response);

    if (!actionsClient || !alertsClient) {
      return siemResponse.error({ statusCode: 404 });
    }

    const rules = await Promise.all(
      request.body.map(async payloadRule => {
        const { id, rule_id: ruleId } = payloadRule;
        const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
        try {
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
            return transformValidateBulkError(idOrRuleIdOrUnknown, rule, ruleStatuses);
          } else {
            return getIdBulkError({ id, ruleId });
          }
        } catch (err) {
          return transformBulkError(idOrRuleIdOrUnknown, err);
        }
      })
    );
    const [validated, errors] = validate(rules, rulesBulkSchema);
    if (errors != null) {
      return siemResponse.error({ statusCode: 500, body: errors });
    } else {
      return response.ok({ body: validated ?? {} });
    }
  };

  router.delete(config, handler);
  router.post(config, handler);
};
