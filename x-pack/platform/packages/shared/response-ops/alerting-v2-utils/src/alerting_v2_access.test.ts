/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { coreMock } from '@kbn/core/public/mocks';
import {
  hasAlertingV2RulesReadCapability,
  shouldShowAlertingV2CreateRuleFlyout,
} from './alerting_v2_access';

describe('hasAlertingV2RulesReadCapability', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
  });

  it('returns true when the user has the read capability', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { read: true },
    };

    expect(hasAlertingV2RulesReadCapability(core)).toBe(true);
  });

  it('returns true when the user has the write capability without read', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { all: true },
    };

    expect(hasAlertingV2RulesReadCapability(core)).toBe(true);
  });

  it('returns false when alerting v2 rules capabilities are unavailable', () => {
    const { alerting_v2_rules: _alertingV2Rules, ...capabilitiesWithoutRules } =
      core.application.capabilities;

    core.application.capabilities = capabilitiesWithoutRules;

    expect(hasAlertingV2RulesReadCapability(core)).toBe(false);
  });

  it('returns false when the capability object is present but empty', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: {},
    };

    expect(hasAlertingV2RulesReadCapability(core)).toBe(false);
  });
});

describe('shouldShowAlertingV2CreateRuleFlyout', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { all: true },
    };
  });

  it('returns true when the user can write rules', () => {
    expect(shouldShowAlertingV2CreateRuleFlyout(core)).toBe(true);
  });

  it('returns false when the user has only the read capability', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { read: true },
    };

    expect(shouldShowAlertingV2CreateRuleFlyout(core)).toBe(false);
  });

  it('returns false when alerting v2 rules capabilities are unavailable', () => {
    const { alerting_v2_rules: _alertingV2Rules, ...capabilitiesWithoutRules } =
      core.application.capabilities;

    core.application.capabilities = capabilitiesWithoutRules;

    expect(shouldShowAlertingV2CreateRuleFlyout(core)).toBe(false);
  });
});
