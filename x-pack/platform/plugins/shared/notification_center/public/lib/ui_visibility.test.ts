/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { BehaviorSubject, firstValueFrom, type Observable } from 'rxjs';
import { NOTIFICATION_CENTER_UI_ENABLED_FLAG } from '../../common/feature_flags';
import {
  NOTIFICATION_CENTER_ENABLED_SETTING,
  namespaceSettingKey,
  typeSettingKey,
} from '../../common/ui_settings';
import {
  getNotificationCenterVisibility$,
  type NotificationCenterVisibility,
} from './ui_visibility';

const NAMESPACE_KEY = namespaceSettingKey('inference');
const TYPE_KEY = typeSettingKey('inference', 'modelStatus');
const MODEL_STATUS_REF = { namespace: 'inference', type: 'modelStatus' };

interface Harness {
  visibility$: Observable<NotificationCenterVisibility>;
  setFlag: (value: boolean) => void;
  setSetting: (key: string, value: boolean) => void;
}

const createHarness = (initial: Record<string, boolean> = {}): Harness => {
  const flag$ = new BehaviorSubject(initial.flag ?? true);
  const settings = new Map<string, BehaviorSubject<boolean>>();

  const subjectFor = (key: string): BehaviorSubject<boolean> => {
    const existing = settings.get(key);
    if (existing) {
      return existing;
    }
    const created = new BehaviorSubject(initial[key] ?? true);
    settings.set(key, created);
    return created;
  };

  const core = {
    featureFlags: {
      getBooleanValue$: (flagName: string) => {
        expect(flagName).toBe(NOTIFICATION_CENTER_UI_ENABLED_FLAG);
        return flag$.asObservable();
      },
    },
    uiSettings: {
      get$: (key: string) => subjectFor(key).asObservable(),
    },
  } as unknown as Pick<CoreStart, 'featureFlags' | 'uiSettings'>;

  return {
    visibility$: getNotificationCenterVisibility$(core),
    setFlag: (value) => flag$.next(value),
    setSetting: (key, value) => subjectFor(key).next(value),
  };
};

describe('getNotificationCenterVisibility$', () => {
  it('shows a type only when the flag, master, namespace and type switches all pass', async () => {
    const { visibility$ } = createHarness();

    await expect(firstValueFrom(visibility$)).resolves.toEqual({
      isEnabled: true,
      visibleTypes: [MODEL_STATUS_REF],
    });
  });

  it.each([
    ['deployment flag', 'flag'],
    ['space master switch', NOTIFICATION_CENTER_ENABLED_SETTING],
  ])('renders nothing when the %s is off', async (_label, key) => {
    const { visibility$ } = createHarness({ [key]: false });

    await expect(firstValueFrom(visibility$)).resolves.toEqual({
      isEnabled: false,
      visibleTypes: [],
    });
  });

  it.each([
    ['namespace', NAMESPACE_KEY],
    ['type', TYPE_KEY],
  ])('keeps the UI enabled but drops the type when its %s switch is off', async (_label, key) => {
    const { visibility$ } = createHarness({ [key]: false });

    await expect(firstValueFrom(visibility$)).resolves.toEqual({
      isEnabled: true,
      visibleTypes: [],
    });
  });

  it('re-emits when a setting is toggled, so a mounted bell does not go stale', async () => {
    const harness = createHarness();
    const emissions: NotificationCenterVisibility[] = [];
    const subscription = harness.visibility$.subscribe((value) => emissions.push(value));

    harness.setSetting(TYPE_KEY, false);
    harness.setSetting(NOTIFICATION_CENTER_ENABLED_SETTING, false);
    harness.setFlag(false);
    subscription.unsubscribe();

    expect(emissions).toEqual([
      { isEnabled: true, visibleTypes: [MODEL_STATUS_REF] },
      { isEnabled: true, visibleTypes: [] },
      { isEnabled: false, visibleTypes: [] },
      { isEnabled: false, visibleTypes: [] },
    ]);
  });
});
