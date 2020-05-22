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
import {
  transformBulkError,
  buildRouteValidation,
  buildSiemResponse,
  validateLicenseForRuleType,
} from '../utils';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { patchRulesBulkSchema } from '../schemas/patch_rules_bulk_schema';
import { rulesBulkSchema } from '../schemas/response/rules_bulk_schema';
import { patchRules } from '../../rules/patch_rules';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';

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
      const siemResponse = buildSiemResponse(response);

      const alertsClient = context.alerting?.getAlertsClient();
      const actionsClient = context.actions?.getActionsClient();
      const savedObjectsClient = context.core.savedObjects.client;

      if (!actionsClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
          const {
            actions,
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
            throttle,
            references,
            note,
            version,
            anomaly_threshold: anomalyThreshold,
            machine_learning_job_id: machineLearningJobId,
          } = payloadRule;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            if (type) {
              validateLicenseForRuleType({ license: context.licensing.license, ruleType: type });
            }

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
              note,
              version,
              anomalyThreshold,
              machineLearningJobId,
            });
            if (rule != null && rule.enabled != null && rule.name != null) {
              const ruleActions = await updateRulesNotifications({
                ruleAlertId: rule.id,
                alertsClient,
                savedObjectsClient,
                enabled: rule.enabled,
                actions,
                throttle,
                name: rule.name,
              });
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
              return transformValidateBulkError(
                rule.id,
                rule,
                ruleActions,
                ruleStatuses.saved_objects[0]
              );
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
