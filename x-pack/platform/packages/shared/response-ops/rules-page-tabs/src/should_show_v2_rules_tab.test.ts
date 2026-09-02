/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { shouldShowAlertingV2RulesTab } from './should_show_v2_rules_tab';

describe('shouldShowAlertingV2RulesTab', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
  });

  it('returns true when alerting v2 is enabled and the user can read rules', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { read: true },
    };

    expect(shouldShowAlertingV2RulesTab(core)).toBe(true);
  });

  it('returns true when the user can only write rules', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { all: true },
    };

    expect(shouldShowAlertingV2RulesTab(core)).toBe(true);
  });

  it('returns false when alerting v2 rules capabilities are unavailable', () => {
    const { alerting_v2_rules: _alertingV2Rules, ...capabilitiesWithoutRules } =
      core.application.capabilities;

    core.application.capabilities = capabilitiesWithoutRules;

    expect(shouldShowAlertingV2RulesTab(core)).toBe(false);
  });

  it('returns false when the rules capability object grants neither read nor write', () => {
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: {},
    };

    expect(shouldShowAlertingV2RulesTab(core)).toBe(false);
  });

  it('returns false when alerting v2 is disabled by the advanced setting', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;
    core.application.capabilities = {
      ...core.application.capabilities,
      alerting_v2_rules: { read: true },
    };

    expect(shouldShowAlertingV2RulesTab(core)).toBe(false);
  });
});
