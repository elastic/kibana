/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRules } from '../../rules/create_rules';
import { IRuleSavedAttributesSavedObjectAttributes } from '../../rules/types';
import { readRules } from '../../rules/read_rules';
import { RuleAlertParamsRest } from '../../types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { getIndexExists } from '../../index/get_index_exists';
import { createRulesSchema } from '../schemas/create_rules_schema';
import { transformError } from '../utils';
import { transform } from './utils';

export const createRulesRoute = (router: IRouter): void => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: (body, { ok, badRequest }) => {
          const { value, error } = createRulesSchema.validate(body);
          if (error) {
            return badRequest(error.message);
          }
          return ok(value as RuleAlertParamsRest); // TODO replace this assertion with
        },
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
        index,
        interval,
        max_signals: maxSignals,
        risk_score: riskScore,
        name,
        severity,
        tags,
        threat,
        to,
        type,
        references,
      } = request.body;
      try {
        const alertsClient = context.alerting.getAlertsClient();
        const actionsClient = context.actions.getActionsClient();
        const clusterClient = context.core.elasticsearch.dataClient;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.siem.getSiemClient();

        if (!actionsClient || !alertsClient) {
          return response.notFound();
        }

        const finalIndex = outputIndex ?? siemClient.signalsIndex;
        const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, finalIndex);
        if (!indexExists) {
          return response.badRequest({
            body: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
          });
        }
        if (ruleId != null) {
          const rule = await readRules({ alertsClient, ruleId });
          if (rule != null) {
            return response.conflict({
              body: `rule_id: "${ruleId}" already exists`,
            });
          }
        }
        const createdRule = await createRules({
          alertsClient,
          actionsClient,
          description,
          enabled,
          falsePositives,
          from,
          immutable: false,
          query,
          language,
          outputIndex: finalIndex,
          savedId,
          timelineId,
          timelineTitle,
          meta,
          filters,
          ruleId: ruleId ?? uuid.v4(),
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
          version: 1,
        });
        const ruleStatuses = await savedObjectsClient.find<
          IRuleSavedAttributesSavedObjectAttributes
        >({
          type: ruleStatusSavedObjectType,
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: `${createdRule.id}`,
          searchFields: ['alertId'],
        });
        const transformed = transform(createdRule, ruleStatuses.saved_objects[0]);
        if (transformed == null) {
          return response.internalError({
            body: 'Internal error transforming rules',
          });
        } else {
          return response.ok({ body: transformed });
        }
      } catch (err) {
        const error = transformError(err);
        return response.customError({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
