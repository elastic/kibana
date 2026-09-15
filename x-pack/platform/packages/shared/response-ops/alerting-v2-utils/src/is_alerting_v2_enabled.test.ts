/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { coreMock } from '@kbn/core/public/mocks';
import {
  canAccessAlertingV2Rules,
  hasAlertingV2Capability,
  isAlertingV2Enabled,
  shouldShowAlertingV2CreateRuleFlyout,
  shouldShowClassicObservabilityAlertsTable,
} from './is_alerting_v2_enabled';

describe('isAlertingV2Enabled', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
  });

  it('returns true when alerting v2 is enabled', () => {
    expect(isAlertingV2Enabled(core)).toBe(true);
  });

  it('returns false when alerting v2 is disabled', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;

    expect(isAlertingV2Enabled(core)).toBe(false);
  });

  it('returns false when alerting v2 is not set', () => {
    core.settings.globalClient.get = <T>(_key: string) => undefined as T;

    expect(isAlertingV2Enabled(core)).toBe(false);
  });

  it('returns false for non-boolean truthy values', () => {
    core.settings.globalClient.get = <T>(_key: string) => 'true' as T;

    expect(isAlertingV2Enabled(core)).toBe(false);
  });
});

describe('shouldShowAlertingV2CreateRuleFlyout', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: {
        all: true,
      },
    };
  });

  it('returns true when alerting v2 is enabled and the user can write rules', () => {
    expect(shouldShowAlertingV2CreateRuleFlyout(core)).toBe(true);
  });

  it('returns false when the user lacks alerting v2 rules write capability', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: {
        read: true,
      },
    };

    expect(shouldShowAlertingV2CreateRuleFlyout(core)).toBe(false);
  });

  it('returns false when alerting v2 rules capabilities are unavailable', () => {
    const { alerting_v2_rules: _alertingV2Rules, ...capabilitiesWithoutRules } =
      core.application.capabilities;

    core.application.capabilities = capabilitiesWithoutRules;

    expect(shouldShowAlertingV2CreateRuleFlyout(core)).toBe(false);
  });

  it('returns false when alerting v2 is disabled by the advanced setting', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;

    expect(shouldShowAlertingV2CreateRuleFlyout(core)).toBe(false);
  });
});

describe('hasAlertingV2Capability', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
  });

  it('returns true for read when the feature has the read capability', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_alerts: { read: true },
    };

    expect(hasAlertingV2Capability(core, 'alerts')).toBe(true);
  });

  it('returns true for read when the feature has the all capability', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { all: true },
    };

    expect(hasAlertingV2Capability(core, 'rules')).toBe(true);
  });

  it('returns true for all when the feature has the all capability', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { all: true },
    };

    expect(hasAlertingV2Capability(core, 'rules', 'all')).toBe(true);
  });

  it('returns false for all when the feature only has the read capability', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { read: true },
    };

    expect(hasAlertingV2Capability(core, 'rules', 'all')).toBe(false);
  });

  it('returns false when the feature capability is missing', () => {
    expect(hasAlertingV2Capability(core, 'actionPolicies')).toBe(false);
  });

  it('returns false when the feature capability is not granted', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_execution_history: { read: false, all: false },
    };

    expect(hasAlertingV2Capability(core, 'executionHistory')).toBe(false);
  });

  it('returns false when the capability object is present but empty', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: {},
    };

    expect(hasAlertingV2Capability(core, 'rules')).toBe(false);
  });
});

describe('shouldShowClassicObservabilityAlertsTable', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => false as T;
    core.settings.client.get = <T>(_key: string) => false as T;
  });

  it('returns true when alerting v2 is disabled', () => {
    expect(shouldShowClassicObservabilityAlertsTable(core)).toBe(true);
  });

  it('returns false when alerting v2 is enabled and the space setting is off', () => {
    core.settings.globalClient.get = <T>(_key: string) => true as T;

    expect(shouldShowClassicObservabilityAlertsTable(core)).toBe(false);
  });

  it('returns true when alerting v2 is enabled and the space setting is on', () => {
    core.settings.globalClient.get = <T>(_key: string) => true as T;
    core.settings.client.get = <T>(_key: string) => true as T;

    expect(shouldShowClassicObservabilityAlertsTable(core)).toBe(true);
  });

  it('returns false when alerting v2 is enabled and the space setting is unset', () => {
    core.settings.globalClient.get = <T>(_key: string) => true as T;
    core.settings.client.get = <T>(_key: string) => undefined as T;

    expect(shouldShowClassicObservabilityAlertsTable(core)).toBe(false);
  });
});

describe('canAccessAlertingV2Rules', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: {
        read: true,
      },
    };
  });

  it('returns true when alerting v2 is enabled and the user can read rules', () => {
    expect(canAccessAlertingV2Rules(core)).toBe(true);
  });

  it('returns true when the user has the write capability without read', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: {
        all: true,
      },
    };

    expect(canAccessAlertingV2Rules(core)).toBe(true);
  });

  it('returns false when alerting v2 rules capabilities are unavailable', () => {
    const { alerting_v2_rules: _alertingV2Rules, ...capabilitiesWithoutRules } =
      core.application.capabilities;

    core.application.capabilities = capabilitiesWithoutRules;

    expect(canAccessAlertingV2Rules(core)).toBe(false);
  });

  it('returns false when alerting v2 is disabled by the advanced setting', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;

    expect(canAccessAlertingV2Rules(core)).toBe(false);
  });
});
