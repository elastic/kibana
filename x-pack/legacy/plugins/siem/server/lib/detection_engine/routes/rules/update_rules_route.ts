/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  UpdateRuleAlertParamsRest,
  IRuleSavedAttributesSavedObjectAttributes,
} from '../../rules/types';
import { updateRulesSchema } from '../schemas/update_rules_schema';
import {
  buildRouteValidation,
  transformError,
  buildSiemResponse,
  validateLicenseForRuleType,
} from '../utils';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { updateRules } from '../../rules/update_rules';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';

export const updateRulesRoute = (router: IRouter) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation<UpdateRuleAlertParamsRest>(updateRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const {
        actions,
        anomaly_threshold: anomalyThreshold,
        description,
        enabled,
        false_positives: falsePositives,
        from,
        query,
        language,
        machine_learning_job_id: machineLearningJobId,
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
        lists,
      } = request.body;
      const siemResponse = buildSiemResponse(response);

      try {
        validateLicenseForRuleType({ license: context.licensing.license, ruleType: type });

        const alertsClient = context.alerting?.getAlertsClient();
        const actionsClient = context.actions?.getActionsClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.siem?.getSiemClient();

        if (!siemClient || !actionsClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const finalIndex = outputIndex ?? siemClient.signalsIndex;
        const rule = await updateRules({
          alertsClient,
          actionsClient,
          anomalyThreshold,
          description,
          enabled,
          falsePositives,
          from,
          query,
          language,
          machineLearningJobId,
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
          note,
          version,
          lists,
          actions: throttle === 'rule' ? actions : [], // Only enable actions if throttle is rule, otherwise we are a notification and should not enable it
        });

        if (rule != null) {
          const ruleActions = await updateRulesNotifications({
            ruleAlertId: rule.id,
            alertsClient,
            savedObjectsClient,
            enabled,
            actions,
            throttle,
            name,
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
          const [validated, errors] = transformValidate(
            rule,
            ruleActions,
            ruleStatuses.saved_objects[0]
          );
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
