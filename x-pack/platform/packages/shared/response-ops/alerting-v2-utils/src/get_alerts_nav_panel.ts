/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootNodeDefinition, StandardNodeDefinition } from '@kbn/core-chrome-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import { isAlertingV2Enabled } from './is_alerting_v2_enabled';

const PANEL_ID = 'alerting';

/**
 * Returns the solution-nav Alerts entry.
 *
 * When `alerting:v2:enabled` is false, returns `alertsNode` unchanged (a
 * direct link). When true, returns a panel opener whose flyout contains the
 * original Alerts page as a flyout link, Rule Management (Rules V2, Rules V1,
 * Rule library), Notifications and Suppressions (Action policies,
 * Maintenance Windows), and Operations (Execution History).
 *
 * Spread into a navigation tree `body`:
 *
 * ```ts
 * ...getAlertingV2AlertsNavPanel(core, {
 *   link: 'observability-overview:alerts',
 *   icon: 'warning',
 * }),
 * ```
 */
export const getAlertingV2AlertsNavPanel = (
  core: CoreStart,
  alertsNode: StandardNodeDefinition
): RootNodeDefinition[] => {
  if (!isAlertingV2Enabled(core)) {
    return [alertsNode];
  }

  return [
    {
      id: PANEL_ID,
      link: alertsNode.link,
      title: alertsNode.title,
      icon: alertsNode.icon,
      renderAs: 'panelOpener',
      children: [
        {
          title: i18n.translate('xpack.alertingV2.nav.alertsSection', {
            defaultMessage: 'Alerts',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            {
              link: 'alertingV2:episodes' as const,
              title: i18n.translate('xpack.alertingV2.nav.inbox', {
                defaultMessage: 'Inbox',
              }),
            },
          ],
        },
        {
          title: i18n.translate('xpack.alertingV2.nav.ruleManagement', {
            defaultMessage: 'Rule Management',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            {
              link: 'management:triggersActions' as const,
              title: i18n.translate('xpack.alertingV2.nav.rulesV1', {
                defaultMessage: 'Rules V1',
              }),
            },
            {
              link: 'alertingV2:rules' as const,
              title: i18n.translate('xpack.alertingV2.nav.rulesV2', {
                defaultMessage: 'Rules V2',
              }),
            },
            { link: 'alertingV2:rule_library' as const },
          ],
        },
        {
          title: i18n.translate('xpack.alertingV2.nav.notificationsAndSuppressions', {
            defaultMessage: 'Notifications and Suppressions',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            {
              link: 'alertingV2:action_policies' as const,
              title: i18n.translate('xpack.alertingV2.nav.actionPolicies', {
                defaultMessage: 'Action policies',
              }),
            },
            { link: 'management:maintenanceWindows' as const },
          ],
        },
        {
          title: i18n.translate('xpack.alertingV2.nav.operations', {
            defaultMessage: 'Operations',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [{ link: 'alertingV2:execution_history' as const }],
        },
      ],
    },
  ];
};
