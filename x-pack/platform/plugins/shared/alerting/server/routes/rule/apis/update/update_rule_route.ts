/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type {
  UpdateRuleRequestBodyV1,
  UpdateRuleRequestParamsV1,
  UpdateRuleResponseV1,
} from '../../../../../common/routes/rule/apis/update';
import {
  updateBodySchemaV1,
  updateParamsSchemaV1,
  updateRuleParamsExamplesV1,
} from '../../../../../common/routes/rule/apis/update';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { ruleResponseSchemaV1 } from '../../../../../common/routes/rule/response';
import type { Rule } from '../../../../application/rule/types';
import type { ILicenseState } from '../../../../lib';
import { RuleTypeDisabledError } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../../lib';
import { transformRuleToRuleResponseV1 } from '../../transforms';
import { validateRequiredGroupInDefaultActionsV1 } from '../../validation';
import { transformUpdateBodyV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { validateInternalRuleType } from '../../../lib/validate_internal_rule_type';

export const updateRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Update a rule`,
        tags: ['oas-tag:alerting'],
        oasOperationObject: updateRuleParamsExamplesV1,
      },
      validate: {
        request: {
          body: updateBodySchemaV1,
          params: updateParamsSchemaV1,
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
          404: {
            description: 'Indicates a rule with the given ID does not exist.',
          },
          409: {
            description: 'Indicates that the rule has already been updated by another user.',
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
          const rulesSettingsClient = (await context.alerting).getRulesSettingsClient(true);
          const ruleTypes = alertingContext.listTypes();

          // Assert versioned inputs
          const updateRuleData: UpdateRuleRequestBodyV1<RuleParamsV1> = req.body;
          const updateRuleParams: UpdateRuleRequestParamsV1 = req.params;

          try {
            const rule = await rulesClient.get({ id: updateRuleParams.id });

            validateInternalRuleType({
              ruleTypeId: rule.alertTypeId,
              ruleTypes,
              operationText: 'update',
            });

            /**
             * Throws an error if the group is not defined in default actions
             */
            const { actions: allActions = [] } = updateRuleData;
            validateRequiredGroupInDefaultActionsV1({
              actions: allActions,
              isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
            });

            const actions = allActions.filter((action) => !actionsClient.isSystemAction(action.id));
            const systemActions = allActions.filter((action) =>
              actionsClient.isSystemAction(action.id)
            );

            const flappingSettings = await rulesSettingsClient.flapping().get();

            // TODO (http-versioning): Remove this cast, this enables us to move forward
            // without fixing all of other solution types
            const updatedRule: Rule<RuleParamsV1> = (await rulesClient.update<RuleParamsV1>({
              id: updateRuleParams.id,
              data: transformUpdateBodyV1<RuleParamsV1>({
                updateBody: updateRuleData,
                actions,
                systemActions,
              }),
              isFlappingEnabled: flappingSettings.enabled,
            })) as Rule<RuleParamsV1>;

            // Assert versioned response type
            const response: UpdateRuleResponseV1<RuleParamsV1> = {
              body: transformRuleToRuleResponseV1<RuleParamsV1>(updatedRule),
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
