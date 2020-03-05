/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { patchRules } from '../../rules/patch_rules';
import {
  PatchRuleAlertParamsRest,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { patchRulesSchema } from '../schemas/patch_rules_schema';
import { buildRouteValidation, transformError, buildSiemResponse } from '../utils';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';

export const patchRulesRoute = (router: IRouter) => {
  router.patch(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation<PatchRuleAlertParamsRest>(patchRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
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
      } = request.body;
      const siemResponse = buildSiemResponse(response);

      try {
        const alertsClient = context.alerting.getAlertsClient();
        const actionsClient = context.actions.getActionsClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!actionsClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const rule = await patchRules({
          actionsClient,
          alertsClient,
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
