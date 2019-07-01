/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';

import { npSetup } from 'ui/new_platform';
import { useObservable } from './use_observable';

/**
 * This hook behaves like a `useState` hook in that it provides a requested
 * setting value (with an optional default) from the Kibana UI settings (also
 * known as "advanced settings") and a setter to change that setting:
 *
 * ```
 * const [darkMode, setDarkMode] = useKibanaUiSetting('theme:darkMode');
 * ```
 *
 * This is not just a static consumption of the value, but will reactively
 * update when the underlying setting subscription of the `UiSettingsClient`
 * notifies of a change.
 *
 * Unlike the `useState`, it doesn't give type guarantees for the value,
 * because the underlying `UiSettingsClient` doesn't support that.
 */
export const useKibanaUiSetting = (key: string, defaultValue?: any) => {
  const uiSettingsClient = npSetup.core.uiSettings;

  const uiSetting$ = useMemo(() => uiSettingsClient.get$(key, defaultValue), [uiSettingsClient]);
  const uiSetting = useObservable(uiSetting$);

  const setUiSetting = useCallback((value: any) => uiSettingsClient.set(key, value), [
    uiSettingsClient,
  ]);

  return [uiSetting, setUiSetting];
};
