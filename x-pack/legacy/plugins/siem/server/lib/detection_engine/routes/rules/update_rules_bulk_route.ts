/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  IRuleSavedAttributesSavedObjectAttributes,
  UpdateRuleAlertParamsRest,
} from '../../rules/types';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { buildRouteValidation, transformBulkError, buildSiemResponse } from '../utils';
import { updateRulesBulkSchema } from '../schemas/update_rules_bulk_schema';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { updateRules } from '../../rules/update_rules';
import { rulesBulkSchema } from '../schemas/response/rules_bulk_schema';

export const updateRulesBulkRoute = (router: IRouter) => {
  router.put(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation<UpdateRuleAlertParamsRest[]>(updateRulesBulkSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const alertsClient = context.alerting.getAlertsClient();
      const actionsClient = context.actions.getActionsClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.siem.getSiemClient();
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
          const finalIndex = outputIndex ?? siemClient.signalsIndex;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            const rule = await updateRules({
              alertsClient,
              actionsClient,
              description,
              enabled,
              immutable: false,
              falsePositives,
              from,
              query,
              language,
              outputIndex: finalIndex,
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
