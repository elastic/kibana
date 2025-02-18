/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroupId,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { AlertingServerSetup, IRuleTypeAlerts, RuleType } from '@kbn/alerting-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { TransformHealthAlert } from '@kbn/alerts-as-data-utils';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import {
  transformHealthRuleParamsSchema,
  type TransformHealthRuleParams,
} from '@kbn/response-ops-rule-params/transform_health';
import {
  PLUGIN,
  type TransformHealthStatus,
  TRANSFORM_RULE_TYPE,
  TRANSFORM_HEALTH_RESULTS,
  TRANSFORM_HEALTH_CHECK_NAMES,
} from '../../../../common/constants';
import { transformHealthServiceProvider } from './transform_health_service';

export interface BaseTransformAlertResponse {
  transform_id: string;
  description?: string;
  health_status: TransformHealthStatus;
  issues?: Array<{ issue: string; details?: string; count: number; first_occurrence?: string }>;
}

export interface TransformStateReportResponse extends BaseTransformAlertResponse {
  transform_state: string;
  node_name?: string;
}

/**
 * @deprecated This health check is no longer in use
 */
export interface ErrorMessagesTransformResponse extends BaseTransformAlertResponse {
  error_messages: Array<{ message: string; timestamp: number; node_name?: string }>;
}

export type TransformHealthResult = TransformStateReportResponse | ErrorMessagesTransformResponse;

export type TransformHealthAlertContext = {
  results: TransformHealthResult[];
  message: string;
} & AlertInstanceContext;

export const TRANSFORM_ISSUE = 'transform_issue';

export type TransformIssue = typeof TRANSFORM_ISSUE;

export const TRANSFORM_ISSUE_DETECTED: ActionGroup<TransformIssue> = {
  id: TRANSFORM_ISSUE,
  name: i18n.translate('xpack.transform.alertingRuleTypes.transformHealth.actionGroupName', {
    defaultMessage: 'Issue detected',
  }),
};

interface RegisterParams {
  logger: Logger;
  alerting: AlertingServerSetup;
  getFieldFormatsStart: () => FieldFormatsStart;
}

export interface TransformHealthAlertState extends RuleTypeState {
  notStarted?: string[];
  unhealthy?: string[];
}

export const TRANSFORM_HEALTH_AAD_INDEX_NAME = 'transform.health';

export const TRANSFORM_HEALTH_AAD_CONFIG: IRuleTypeAlerts<TransformHealthAlert> = {
  context: TRANSFORM_HEALTH_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
      [TRANSFORM_HEALTH_RESULTS]: {
        type: ES_FIELD_TYPES.OBJECT,
        array: true,
        required: false,
        dynamic: false,
        properties: {
          transform_id: { type: ES_FIELD_TYPES.KEYWORD },
          description: { type: ES_FIELD_TYPES.TEXT },
          health_status: { type: ES_FIELD_TYPES.KEYWORD },
          issues: { type: ES_FIELD_TYPES.OBJECT },
          transform_state: { type: ES_FIELD_TYPES.KEYWORD },
          node_name: { type: ES_FIELD_TYPES.KEYWORD },
        },
      },
    },
  },
  shouldWrite: true,
};

export function registerTransformHealthRuleType(params: RegisterParams) {
  const { alerting } = params;
  alerting.registerType(getTransformHealthRuleType(params.getFieldFormatsStart));
}

export function getTransformHealthRuleType(
  getFieldFormatsStart: () => FieldFormatsStart
): RuleType<
  TransformHealthRuleParams,
  never,
  TransformHealthAlertState,
  AlertInstanceState,
  TransformHealthAlertContext,
  TransformIssue,
  RecoveredActionGroupId,
  TransformHealthAlert
> {
  return {
    id: TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
    name: i18n.translate('xpack.transform.alertingRuleTypes.transformHealth.name', {
      defaultMessage: 'Transform health',
    }),
    actionGroups: [TRANSFORM_ISSUE_DETECTED],
    defaultActionGroupId: TRANSFORM_ISSUE,
    validate: { params: transformHealthRuleParamsSchema },
    schemas: {
      params: {
        type: 'config-schema',
        schema: transformHealthRuleParamsSchema,
      },
    },
    actionVariables: {
      context: [
        {
          name: 'results',
          description: i18n.translate(
            'xpack.transform.alertTypes.transformHealth.alertContext.resultsDescription',
            {
              defaultMessage: 'Rule execution results',
            }
          ),
        },
        {
          name: 'message',
          description: i18n.translate(
            'xpack.transform.alertTypes.transformHealth.alertContext.messageDescription',
            {
              defaultMessage: 'Alert info message',
            }
          ),
        },
      ],
    },
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: 'stackAlerts',
    minimumLicenseRequired: PLUGIN.MINIMUM_LICENSE_REQUIRED,
    isExportable: true,
    doesSetRecoveryContext: true,
    alerts: TRANSFORM_HEALTH_AAD_CONFIG,
    async executor(options) {
      const {
        services: { scopedClusterClient, alertsClient, uiSettingsClient },
        params,
        state: previousState,
      } = options;

      if (!alertsClient) {
        throw new AlertsClientError();
      }

      const fieldFormatsRegistry = await getFieldFormatsStart().fieldFormatServiceFactory(
        uiSettingsClient
      );

      const transformHealthService = transformHealthServiceProvider({
        esClient: scopedClusterClient.asCurrentUser,
        fieldFormatsRegistry,
      });

      const executionResult = await transformHealthService.getHealthChecksResults(
        params,
        previousState
      );

      const unhealthyTests = executionResult.filter(({ isHealthy }) => !isHealthy);

      const state: TransformHealthAlertState = {};

      if (unhealthyTests.length > 0) {
        unhealthyTests.forEach(({ name: alertInstanceName, context }) => {
          switch (alertInstanceName) {
            case TRANSFORM_HEALTH_CHECK_NAMES.notStarted.name:
              state.notStarted = context.results.map((r) => r.transform_id);
            case TRANSFORM_HEALTH_CHECK_NAMES.healthCheck.name:
              state.unhealthy = context.results.map((r) => r.transform_id);
          }

          alertsClient.report({
            id: alertInstanceName,
            actionGroup: TRANSFORM_ISSUE,
            context,
            payload: {
              [ALERT_REASON]: context.message,
              [TRANSFORM_HEALTH_RESULTS]: context.results,
            },
          });
        });
      }

      // Set context for recovered alerts
      for (const recoveredAlert of alertsClient.getRecoveredAlerts()) {
        const recoveredAlertId = recoveredAlert.alert.getId();

        const testResult = executionResult.find((v) => v.name === recoveredAlertId);

        if (testResult) {
          alertsClient.setAlertData({
            id: recoveredAlertId,
            context: testResult.context,
            payload: {
              [ALERT_REASON]: testResult.context.message,
              [TRANSFORM_HEALTH_RESULTS]: testResult.context.results,
            },
          });
        }
      }

      return { state };
    },
  };
}
