/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRules } from '../../rules/create_rules';
import { RuleAlertParamsRest } from '../../types';
import { readRules } from '../../rules/read_rules';
import { getDuplicates } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { getIndexExists } from '../../index/get_index_exists';
import {
  transformBulkError,
  createBulkErrorObject,
  buildRouteValidation,
  buildSiemResponse,
} from '../utils';
import { createRulesBulkSchema } from '../schemas/create_rules_bulk_schema';
import { rulesBulkSchema } from '../schemas/response/rules_bulk_schema';

export const createRulesBulkRoute = (router: IRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
      validate: {
        body: buildRouteValidation<RuleAlertParamsRest[]>(createRulesBulkSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const alertsClient = context.alerting.getAlertsClient();
      const actionsClient = context.actions.getActionsClient();
      const clusterClient = context.core.elasticsearch.dataClient;
      const siemClient = context.siem.getSiemClient();
      const siemResponse = buildSiemResponse(response);

      if (!actionsClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const ruleDefinitions = request.body;
      const dupes = getDuplicates(ruleDefinitions, 'rule_id');

      const rules = await Promise.all(
        ruleDefinitions
          .filter(rule => rule.rule_id == null || !dupes.includes(rule.rule_id))
          .map(async payloadRule => {
            const {
              description,
              enabled,
              false_positives: falsePositives,
              from,
              query,
              language,
              output_index: outputIndex,
              saved_id: savedId,
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
              timeline_id: timelineId,
              timeline_title: timelineTitle,
              version,
            } = payloadRule;
            const ruleIdOrUuid = ruleId ?? uuid.v4();
            try {
              const finalIndex = outputIndex ?? siemClient.signalsIndex;
              const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, finalIndex);
              if (!indexExists) {
                return createBulkErrorObject({
                  ruleId: ruleIdOrUuid,
                  statusCode: 400,
                  message: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
                });
              }
              if (ruleId != null) {
                const rule = await readRules({ alertsClient, ruleId });
                if (rule != null) {
                  return createBulkErrorObject({
                    ruleId,
                    statusCode: 409,
                    message: `rule_id: "${ruleId}" already exists`,
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
                ruleId: ruleIdOrUuid,
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
              return transformValidateBulkError(ruleIdOrUuid, createdRule);
            } catch (err) {
              return transformBulkError(ruleIdOrUuid, err);
            }
          })
      );
      const rulesBulk = [
        ...rules,
        ...dupes.map(ruleId =>
          createBulkErrorObject({
            ruleId,
            statusCode: 409,
            message: `rule_id: "${ruleId}" already exists`,
          })
        ),
      ];
      const [validated, errors] = validate(rulesBulk, rulesBulkSchema);
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    }
  );
};
