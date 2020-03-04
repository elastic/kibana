/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  IRuleSavedAttributesSavedObjectAttributes,
  PatchRuleAlertParamsRest,
} from '../../rules/types';
import { transformBulkError, buildRouteValidation, buildSiemResponse } from '../utils';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { patchRulesBulkSchema } from '../schemas/patch_rules_bulk_schema';
import { rulesBulkSchema } from '../schemas/response/rules_bulk_schema';
import { patchRules } from '../../rules/patch_rules';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const patchRulesBulkRoute = (router: IRouter) => {
  router.patch(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation<PatchRuleAlertParamsRest[]>(patchRulesBulkSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const alertsClient = context.alerting.getAlertsClient();
      const actionsClient = context.actions.getActionsClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemResponse = buildSiemResponse(response);

      if (!actionsClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const rules = await Promise.all(
        request.body.map(async payloadRule => {
          const {
            description,
            enabled,
            false_positives: falsePositives,
            from,
            query,
            language,
            output_index: outputIndex,
            saved_id: savedId,
            timeline_id: timelineId,
            timeline_title: timelineTitle,
            meta,
            filters,
            rule_id: ruleId,
            id,
            index,
            interval,
            max_signals: maxSignals,
            risk_score: riskScore,
            name,
            severity,
            tags,
            to,
            type,
            threat,
            references,
            version,
          } = payloadRule;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            const rule = await patchRules({
              alertsClient,
              actionsClient,
              description,
              enabled,
              falsePositives,
              from,
              query,
              language,
              outputIndex,
              savedId,
              savedObjectsClient,
              timelineId,
              timelineTitle,
              meta,
              filters,
              id,
              ruleId,
              index,
              interval,
              maxSignals,
              riskScore,
              name,
              severity,
              tags,
              to,
              type,
              threat,
              references,
              version,
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
              return transformValidateBulkError(rule.id, rule, ruleStatuses.saved_objects[0]);
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
    }
  );
};
