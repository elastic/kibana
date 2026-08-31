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

  it('returns a panel opener with rules, rule library, and action policies when alerting v2 is enabled', () => {
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
            breadcrumbStatus: 'hidden',
            children: [
              {
                link: 'observability-overview:alerts',
                title: 'Alerts',
              },
            ],
          },
          {
            title: 'Rule Management',
            breadcrumbStatus: 'hidden',
            children: [{ link: 'management:rules' }, { link: 'management:rule_library' }],
          },
          {
            title: 'Notifications and Suppressions',
            breadcrumbStatus: 'hidden',
            children: [{ link: 'management:action_policies' }],
          },
        ],
      })
    );
  });

  it('keeps the original Alerts leaf when alerting v2 is disabled', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;

    expect(getAlertingV2AlertsNavPanel(core, alertsNode)).toEqual([alertsNode]);
  });

  it('moves a custom getIsActive onto the classic Alerts flyout child', () => {
    const getIsActive = ({
      pathNameSerialized,
      prepend,
    }: {
      pathNameSerialized: string;
      prepend: (path: string) => string;
    }) => pathNameSerialized.startsWith(prepend('/app/observability/alerts'));

    const [panel] = getAlertingV2AlertsNavPanel(core, { ...alertsNode, getIsActive });

    expect(panel.children?.[0]).toEqual({
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'observability-overview:alerts',
          title: 'Alerts',
          getIsActive,
        },
      ],
    });
  });
});
