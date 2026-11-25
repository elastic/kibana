/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { isPlainObject } from 'lodash';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public';
import { AlertProvidedActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import {
  CONNECTOR_ID,
  EVENT_RESOLVE,
  EVENT_TRIGGER,
  MATCH_ON_CATALOG,
  MATCH_ON_SERVICE,
  MAX_CATALOG_LENGTH,
  MAX_LABEL_NAME_LENGTH,
  MAX_LABELS,
  MAX_TARGET_ID_LENGTH,
} from '@kbn/connector-schemas/rootly_alerts/constants';
import type { RootlyAlertsActionParams, RootlyAlertsConfig, RootlyAlertsSecrets } from './types';

const DEFAULT_DEDUP_KEY = `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`;

export function getConnectorType(): ConnectorTypeModel<
  RootlyAlertsConfig,
  RootlyAlertsSecrets,
  RootlyAlertsActionParams
> {
  return {
    id: CONNECTOR_ID,
    iconClass: lazy(() => import('./logo').then(({ Logo }) => ({ default: Logo }))),
    selectMessage: i18n.translate(
      'xpack.stackConnectors.components.rootlyAlerts.selectMessageText',
      {
        defaultMessage: 'Send an alert to Rootly.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.rootlyAlerts.connectorTypeTitle',
      {
        defaultMessage: 'Send to Rootly Alerts',
      }
    ),
    validateParams: async (
      actionParams: RootlyAlertsActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        dedupKey: new Array<string>(),
        title: new Array<string>(),
        match: new Array<string>(),
        target: new Array<string>(),
        labels: new Array<string>(),
        customDetails: new Array<string>(),
      };
      const validationResult = { errors };
      const { event, dedupKey, title, match, target, labels, customDetails } = actionParams;

      // The connector test form starts with no event, which is sent as a trigger.
      if (event && event !== EVENT_TRIGGER) {
        if (!dedupKey?.trim()) {
          errors.dedupKey.push(translations.DEDUP_KEY_REQUIRED);
        }
        return validationResult;
      }

      if (!title?.trim()) {
        errors.title.push(translations.TITLE_REQUIRED);
      }

      if (target) {
        if (!target.id?.trim()) {
          errors.target.push(translations.TARGET_ID_REQUIRED);
        } else if (target.id.length > MAX_TARGET_ID_LENGTH) {
          errors.target.push(translations.TARGET_ID_TOO_LONG);
        }
      } else if (match?.on === MATCH_ON_CATALOG) {
        if (match.value?.trim() && !match.catalog?.trim()) {
          errors.match.push(translations.CATALOG_REQUIRED);
        } else if ((match.catalog?.length ?? 0) > MAX_CATALOG_LENGTH) {
          errors.match.push(translations.CATALOG_TOO_LONG);
        }
      }

      const labelNames = (labels ?? []).map(({ key }) => key.trim());
      if (labelNames.includes('')) {
        errors.labels.push(translations.LABEL_NAME_REQUIRED);
      }
      if (new Set(labelNames).size !== labelNames.length) {
        errors.labels.push(translations.LABEL_NAME_DUPLICATE);
      }
      if ((labels ?? []).some(({ key }) => key.length > MAX_LABEL_NAME_LENGTH)) {
        errors.labels.push(translations.LABEL_NAME_TOO_LONG);
      }
      if ((labels ?? []).length > MAX_LABELS) {
        errors.labels.push(translations.LABELS_TOO_MANY);
      }

      if (customDetails?.length) {
        try {
          if (!isPlainObject(JSON.parse(customDetails))) {
            errors.customDetails.push(translations.CUSTOM_DETAILS_INVALID);
          }
        } catch {
          errors.customDetails.push(translations.CUSTOM_DETAILS_INVALID);
        }
      }

      return validationResult;
    },
    actionConnectorFields: lazy(() =>
      import('./rootly_alerts_connectors').then(({ RootlyAlertsActionConnectorFields }) => ({
        default: RootlyAlertsActionConnectorFields,
      }))
    ),
    actionParamsFields: lazy(() =>
      import('./rootly_alerts_params').then(({ RootlyAlertsParamsFields }) => ({
        default: RootlyAlertsParamsFields,
      }))
    ),
    defaultActionParams: {
      event: EVENT_TRIGGER,
      dedupKey: DEFAULT_DEDUP_KEY,
      title: `{{${AlertProvidedActionVariables.ruleName}}}`,
      description: '{{context.reason}}',
      url: `{{${AlertProvidedActionVariables.ruleUrl}}}`,
      match: { on: MATCH_ON_SERVICE, value: '{{context.serviceName}}' },
      ruleId: `{{${AlertProvidedActionVariables.ruleId}}}`,
      ruleName: `{{${AlertProvidedActionVariables.ruleName}}}`,
      alertId: `{{${AlertProvidedActionVariables.alertId}}}`,
      space: `{{${AlertProvidedActionVariables.ruleSpaceId}}}`,
      evaluationTime: `{{${AlertProvidedActionVariables.date}}}`,
    },
    defaultRecoveredActionParams: {
      event: EVENT_RESOLVE,
      dedupKey: DEFAULT_DEDUP_KEY,
    },
  };
}
