/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of } from 'rxjs';
import { NOTIFICATION_CENTER_UI_ENABLED_FLAG } from '../../common/feature_flags';
import { NOTIFICATION_CENTER_ENABLED_SETTING } from '../../common/ui_settings';
import type { NotificationCenterVisibilityDeps } from './ui_visibility';
import { notificationCenterVisible$, visibleNotificationTypes$ } from './ui_visibility';

// A two-type registry so both the flagged and the unflagged branch stay covered as the real
// registry grows.
const FLAGGED_TYPE_FLAG = 'notificationCenter.types.demo.flagged';
jest.mock('../../common/notification_registry', () => ({
  NOTIFICATION_REGISTRY: {
    demo: {
      display_name: 'Demo',
      description: 'Demo notifications.',
      types: {
        flagged: {
          display_name: 'Flagged',
          description: 'Gated by a feature flag.',
          feature_flag: 'notificationCenter.types.demo.flagged',
        },
        unflagged: { display_name: 'Unflagged', description: 'No feature flag.' },
      },
    },
  },
}));

const FLAGGED_TYPE = 'demo.flagged';
const UNFLAGGED_TYPE = 'demo.unflagged';
const settingKey = (typeId: string) => `notificationCenter:types:${typeId}`;

const buildDeps = ({
  flags = {},
  settings = {},
}: {
  flags?: Record<string, boolean>;
  settings?: Record<string, boolean>;
}): NotificationCenterVisibilityDeps =>
  ({
    featureFlags: {
      getBooleanValue$: (flagName: string, fallback: boolean) => of(flags[flagName] ?? fallback),
    },
    uiSettings: {
      get$: (key: string, fallback: boolean) => of(settings[key] ?? fallback),
    },
  } as unknown as NotificationCenterVisibilityDeps);

describe('notificationCenterVisible$', () => {
  it.each`
    flagEnabled | optedIn  | visible
    ${false}    | ${false} | ${false}
    ${true}     | ${false} | ${false}
    ${false}    | ${true}  | ${false}
    ${true}     | ${true}  | ${true}
  `(
    'is $visible when the flag is $flagEnabled and the space opt-in is $optedIn',
    async ({ flagEnabled, optedIn, visible }) => {
      const deps = buildDeps({
        flags: { [NOTIFICATION_CENTER_UI_ENABLED_FLAG]: flagEnabled },
        settings: { [NOTIFICATION_CENTER_ENABLED_SETTING]: optedIn },
      });

      await expect(firstValueFrom(notificationCenterVisible$(deps))).resolves.toBe(visible);
    }
  );

  it('stays hidden when neither the flag nor the setting has a value', async () => {
    await expect(firstValueFrom(notificationCenterVisible$(buildDeps({})))).resolves.toBe(false);
  });
});

describe('visibleNotificationTypes$', () => {
  it('lists a flagged type only when its opt-in and its feature flag are both on', async () => {
    const deps = buildDeps({
      flags: { [FLAGGED_TYPE_FLAG]: true },
      settings: { [settingKey(FLAGGED_TYPE)]: true },
    });

    await expect(firstValueFrom(visibleNotificationTypes$(deps))).resolves.toEqual([FLAGGED_TYPE]);
  });

  it('omits a flagged type whose opt-in is off', async () => {
    const deps = buildDeps({ flags: { [FLAGGED_TYPE_FLAG]: true } });

    await expect(firstValueFrom(visibleNotificationTypes$(deps))).resolves.toEqual([]);
  });

  it('omits an opted-in type whose feature flag is off', async () => {
    const deps = buildDeps({ settings: { [settingKey(FLAGGED_TYPE)]: true } });

    await expect(firstValueFrom(visibleNotificationTypes$(deps))).resolves.toEqual([]);
  });

  it('lists an unflagged type on its opt-in alone', async () => {
    const deps = buildDeps({ settings: { [settingKey(UNFLAGGED_TYPE)]: true } });

    await expect(firstValueFrom(visibleNotificationTypes$(deps))).resolves.toEqual([
      UNFLAGGED_TYPE,
    ]);
  });
});
