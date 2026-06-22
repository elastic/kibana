/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { shouldShowAlertingV2CreateRuleFlyout } from './should_show_alerting_v2_create_rule_flyout';

describe('shouldShowAlertingV2CreateRuleFlyout', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;
  });

  it('returns true when all conditions are met', () => {
    expect(
      shouldShowAlertingV2CreateRuleFlyout(core, {
        isEsqlMode: true,
        isPluginAvailable: true,
      })
    ).toBe(true);
  });

  it('returns false when not in ES|QL mode', () => {
    expect(
      shouldShowAlertingV2CreateRuleFlyout(core, {
        isEsqlMode: false,
        isPluginAvailable: true,
      })
    ).toBe(false);
  });

  it('returns false when the alerting v2 plugin is unavailable', () => {
    expect(
      shouldShowAlertingV2CreateRuleFlyout(core, {
        isEsqlMode: true,
        isPluginAvailable: false,
      })
    ).toBe(false);
  });

  it('returns false when alerting v2 is disabled by the advanced setting', () => {
    core.settings.globalClient.get = <T>(_key: string) => false as T;

    expect(
      shouldShowAlertingV2CreateRuleFlyout(core, {
        isEsqlMode: true,
        isPluginAvailable: true,
      })
    ).toBe(false);
  });
});
