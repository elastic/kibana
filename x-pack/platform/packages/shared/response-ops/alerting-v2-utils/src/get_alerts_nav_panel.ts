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
 * original Alerts page, Rule Management (Rules, Rule library), and
 * Notifications and Suppressions (Action Policies).
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
        ...(alertsNode.link
          ? [
              {
                link: alertsNode.link,
                ...(alertsNode.getIsActive ? { getIsActive: alertsNode.getIsActive } : {}),
              },
            ]
          : []),
        {
          title: i18n.translate('xpack.alertingV2.nav.ruleManagement', {
            defaultMessage: 'Rule Management',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [
            { link: 'management:rules' as const },
            { link: 'management:rule_library' as const },
          ],
        },
        {
          title: i18n.translate('xpack.alertingV2.nav.notificationsAndSuppressions', {
            defaultMessage: 'Notifications and Suppressions',
          }),
          breadcrumbStatus: 'hidden' as const,
          children: [{ link: 'management:action_policies' as const }],
        },
      ],
    },
  ];
};
