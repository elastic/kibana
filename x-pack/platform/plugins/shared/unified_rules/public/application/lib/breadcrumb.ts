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
import { getIsExperimentalFeatureEnabled } from '@kbn/triggers-actions-ui-plugin/public';

export const getAlertingSectionBreadcrumb = (
  type: string,
  returnHref = false
): { text: string; href?: string } => {
  switch (type) {
    case 'logs':
      return {
        text: i18n.translate('xpack.unifiedRules.logs.breadcrumbTitle', {
          defaultMessage: 'Logs',
        }),
        ...(returnHref ? { href: `${routeToLogs}` } : {}),
      };
    case 'connectors':
      return {
        text: i18n.translate('xpack.unifiedRules.connectors.breadcrumbTitle', {
          defaultMessage: 'Connectors',
        }),
        ...(returnHref ? { href: `${routeToConnectors}` } : {}),
      };
    case 'rules':
      return {
        text: i18n.translate('xpack.unifiedRules.rules.breadcrumbTitle', {
          defaultMessage: 'Rules',
        }),
        ...(returnHref ? { href: `${routeToRules}` } : {}),
      };
    case 'alerts':
      return {
        text: i18n.translate('xpack.unifiedRules.alerts.breadcrumbTitle', {
          defaultMessage: 'Alerts',
        }),
        ...(returnHref ? { href: `${legacyRouteToAlerts}` } : {}),
      };
    case 'createRule':
      return {
        text: i18n.translate('xpack.unifiedRules.rules.create.breadcrumbTitle', {
          defaultMessage: 'Create',
        }),
      };
    case 'editRule':
      return {
        text: i18n.translate('xpack.unifiedRules.rules.edit.breadcrumbTitle', {
          defaultMessage: 'Edit',
        }),
      };
    default:
      return {
        text: i18n.translate('xpack.unifiedRules.home.breadcrumbTitle', {
          defaultMessage: 'Rules',
        }),
        ...(returnHref ? { href: `${routeToHome}` } : {}),
      };
  }
};

export const getRulesBreadcrumbWithHref = (
  getUrlForApp: (appId: string, options?: { path?: string }) => string
) => {
  const rulesBreadcrumb = getAlertingSectionBreadcrumb('rules', true);
  const useUnifiedRulesPage = getIsExperimentalFeatureEnabled('unifiedRulesPage');
  const breadcrumbHref = useUnifiedRulesPage
    ? getUrlForApp('rules', { path: '/' })
    : getUrlForApp('management', { path: 'insightsAndAlerting/triggersActions/rules' });

  return {
    ...rulesBreadcrumb,
    href: breadcrumbHref,
  };
};
