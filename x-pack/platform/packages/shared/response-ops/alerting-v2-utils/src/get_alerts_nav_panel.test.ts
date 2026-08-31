/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { getAlertingV2AlertsNavPanel } from './get_alerts_nav_panel';

const alertsNode = {
  link: 'observability-overview:alerts' as const,
  icon: 'warning',
};

describe('getAlertingV2AlertsNavPanel', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
  });

  it('returns a panel opener with inbox, alerts v1, alerts v2, rules, rule library, action policies, maintenance windows, and execution history when alerting v2 is enabled', () => {
    const result = getAlertingV2AlertsNavPanel(core, alertsNode);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'alerting',
        link: 'observability-overview:alerts',
        icon: 'warning',
        renderAs: 'panelOpener',
        children: [
          {
            title: 'Alerts',
            breadcrumbStatus: 'hidden',
            children: [
              { link: 'alertingV2:episodes', title: 'Inbox' },
            ],
          },
          {
            title: 'Rule Management',
            breadcrumbStatus: 'hidden',
            children: [
              { link: 'management:triggersActions', title: 'Rules V1' },
              { link: 'alertingV2:rules', title: 'Rules V2' },
              { link: 'alertingV2:rule_library' },
            ],
          },
          {
            title: 'Notifications and Suppressions',
            breadcrumbStatus: 'hidden',
            children: [
              { link: 'alertingV2:action_policies', title: 'Action policies' },
              { link: 'management:maintenanceWindows' },
            ],
          },
          {
            title: 'Operations',
            breadcrumbStatus: 'hidden',
            children: [{ link: 'alertingV2:execution_history' }],
          },
        ],
      })
    );
  });

  it('keeps the original Alerts leaf when alerting v2 is disabled', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;

    expect(getAlertingV2AlertsNavPanel(core, alertsNode)).toEqual([alertsNode]);
  });

  it('renders the Alerts section with only Inbox when getIsActive is provided', () => {
    const getIsActive = ({
      pathNameSerialized,
      prepend,
    }: {
      pathNameSerialized: string;
      prepend: (path: string) => string;
    }) => pathNameSerialized.startsWith(prepend('/app/observability/alerts'));

    const [panel] = getAlertingV2AlertsNavPanel(core, { ...alertsNode, getIsActive });

    const alertsSection = panel.children?.[0];
    expect(alertsSection).toEqual({
      title: 'Alerts',
      breadcrumbStatus: 'hidden',
      children: [
        { link: 'alertingV2:episodes', title: 'Inbox' },
      ],
    });
  });
});
