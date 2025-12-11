/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteOptions } from '../../..';
import { schema } from '@kbn/config-schema';
import type { CreateRuleResponseV1 } from '../../../../../common/routes/rule/apis/create';
import {
  createParamsSchemaV1,
  createRuleParamsExamplesV1,
} from '../../../../../common/routes/rule/apis/create';
import { createESQLBodySchemaV1 } from './schemas';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { ruleResponseSchemaV1 } from '../../../../../common/routes/rule/response';
import { RuleTypeDisabledError } from '../../../../lib';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../../lib';
import { validateInternalRuleType } from '../../../lib/validate_internal_rule_type';
import { transformRuleToRuleResponseV1 } from '../../transforms';
import { validateRequiredGroupInDefaultActionsV1 } from '../../validation';

export const createEsqlRuleRoute = (routeOptions: RouteOptions) => {
  const { router, licenseState } = routeOptions;
  router.post(
    {
      path: `/api/rule/esql/{id?}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Create an ESQL rule`,
        tags: ['oas-tag:alerting'],
        oasOperationObject: createRuleParamsExamplesV1,
      },
      validate: {
        request: {
          body: createESQLBodySchemaV1,
          params: createParamsSchemaV1,
        },
        response: {
          200: {
            body: () => ruleResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          409: {
            description: 'Indicates that the rule id is already in use.',
          },
        },
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();
          const actionsClient = (await context.actions).getActionsClient();
          const ruleTypes = alertingContext.listTypes();

          const originalRuleData: any = req.body;

          // Transform the incoming request to match the structure expected by the rulesClient.
          const durationMatch = originalRuleData.lookbackWindow.match(/^(\d+)([smhd])$/);
          const timeWindowSize = durationMatch ? parseInt(durationMatch[1], 10) : 0;
          const timeWindowUnit = durationMatch ? durationMatch[2] : 'm';

          const paramsForCreate: RuleParamsV1 = {
            esqlQuery: {
              esql: originalRuleData.esql,
            },
            timeWindowSize,
            timeWindowUnit,
            timeField: originalRuleData.timeField,
            group_key: originalRuleData.group_key,
            role: 'parent',
          };

          if (originalRuleData.parentId) {
            (paramsForCreate as any).parentId = originalRuleData.parentId;
          }

          try {
            validateInternalRuleType({
              ruleTypeId: '.esql',
              ruleTypes,
              operationText: 'create',
            });

            const { actions: allActions = [] } = originalRuleData;
            validateRequiredGroupInDefaultActionsV1({
              actions: allActions,
              isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
            });

            const actions = allActions.filter((action) => !actionsClient.isSystemAction(action.id));

            const createdRules = await rulesClient.createESQLRule(
              {
                name: originalRuleData.name,
                tags: originalRuleData.tags,
                schedule: { interval: originalRuleData.schedule },
                actions,
                enabled: originalRuleData.enabled,
                consumer: 'alerts',
                alertTypeId: '.esql',
                params: paramsForCreate,
                artifacts: originalRuleData.artifacts,
              },
              originalRuleData.track
            );

            const response: CreateRuleResponseV1<RuleParamsV1> = {
              body: createdRules[0],
            };

            return res.ok(response);
          } catch (e) {
            if (e instanceof RuleTypeDisabledError) {
              return e.sendResponse(res);
            }
            throw e;
          }
        })
      )
    )
  );
};
