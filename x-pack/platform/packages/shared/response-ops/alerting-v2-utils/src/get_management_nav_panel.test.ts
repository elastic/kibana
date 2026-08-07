/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { coreMock } from '@kbn/core/public/mocks';
import {
  getAlertingV2AutomationNavItems,
  getAlertingV2ManagementNavPanel,
} from './get_management_nav_panel';

describe('getAlertingV2AutomationNavItems', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
  });

  it('returns all former Preview apps in all mode', () => {
    expect(getAlertingV2AutomationNavItems(core, 'all')).toEqual([
      { link: 'management:rules' },
      { link: 'management:episodes' },
      { link: 'management:action_policies' },
      {
        id: 'alerts_execution_history_demo',
        link: 'management:execution_history',
        title: 'Execution history',
        badgeType: 'new',
      },
    ]);
  });

  it('returns only execution history in stackRemainder mode', () => {
    expect(getAlertingV2AutomationNavItems(core, 'stackRemainder')).toEqual([
      {
        id: 'alerts_execution_history_demo',
        link: 'management:execution_history',
        title: 'Execution history',
        badgeType: 'new',
      },
    ]);
  });

  it('returns an empty array when alerting v2 is disabled', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;
    expect(getAlertingV2AutomationNavItems(core, 'all')).toEqual([]);
  });
});

describe('getAlertingV2ManagementNavPanel', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
  });

  it('returns the Alerting V2 Preview panel when enabled', () => {
    expect(getAlertingV2ManagementNavPanel(core)).toEqual([
      {
        id: 'alerting_v2_panel',
        title: 'Alerting V2 Preview',
        children: [
          { link: 'management:rules' },
          { link: 'management:episodes' },
          { link: 'management:action_policies' },
          { link: 'management:execution_history' },
        ],
      },
    ]);
  });

  it('returns an empty array when alerting v2 is disabled', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;
    expect(getAlertingV2ManagementNavPanel(core)).toEqual([]);
  });
});
