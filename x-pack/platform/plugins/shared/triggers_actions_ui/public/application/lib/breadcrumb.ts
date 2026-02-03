/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  routeToHome,
  routeToConnectors,
  routeToRules,
  routeToLogs,
  legacyRouteToAlerts,
} from '../constants';

export const getAlertingSectionBreadcrumb = (
  type: string,
  returnHref = false
): { text: string; href?: string } => {
  // Home and sections
  switch (type) {
    case 'logs':
      return {
        text: i18n.translate('xpack.triggersActionsUI.logs.breadcrumbTitle', {
          defaultMessage: 'Logs',
        }),
        ...(returnHref
          ? {
              href: `${routeToLogs}`,
            }
          : {}),
      };
    case 'connectors':
      return {
        text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
          defaultMessage: 'Connectors',
        }),
        ...(returnHref
          ? {
              href: `${routeToConnectors}`,
            }
          : {}),
      };
    case 'rules':
      return {
        text: i18n.translate('xpack.triggersActionsUI.rules.breadcrumbTitle', {
          defaultMessage: 'Rules',
        }),
        ...(returnHref
          ? {
              href: `${routeToRules}`,
            }
          : {}),
      };
    case 'alerts':
      return {
        text: i18n.translate('xpack.triggersActionsUI.alerts.breadcrumbTitle', {
          defaultMessage: 'Alerts',
        }),
        ...(returnHref
          ? {
              href: `${legacyRouteToAlerts}`,
            }
          : {}),
      };
    case 'createRule':
      return {
        text: i18n.translate('xpack.triggersActionsUI.rules.create.breadcrumbTitle', {
          defaultMessage: 'Create',
        }),
      };
    case 'editRule':
      return {
        text: i18n.translate('xpack.triggersActionsUI.rules.edit.breadcrumbTitle', {
          defaultMessage: 'Edit',
        }),
      };
    default:
      return {
        text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
          defaultMessage: 'Rules',
        }),
        ...(returnHref
          ? {
              href: `${routeToHome}`,
            }
          : {}),
      };
  }
};

/**
 * Get the rules breadcrumb with the appropriate href based on app registration
 */
export const getRulesBreadcrumbWithHref = (
  isAppRegistered: (appId: string) => boolean,
  getUrlForApp: (appId: string, options?: { path?: string }) => string
) => {
  const rulesBreadcrumb = getAlertingSectionBreadcrumb('rules', true);

  const breadcrumbHref = isAppRegistered('rules')
    ? getUrlForApp('rules', { path: '/' })
    : getUrlForApp('management', { path: 'insightsAndAlerting/triggersActions/rules' });

  return {
    ...rulesBreadcrumb,
    href: breadcrumbHref,
  };
};
