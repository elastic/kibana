/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';

import { DEFAULT_KBN_VERSION, DEFAULT_TIMEZONE_BROWSER } from '../../../common/constants';
import { useKibanaCore } from '../compose/kibana_core';
import { useObservable } from './use_observable';

type GenericValue = string | boolean | number;

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
export const useKibanaUiSetting = (key: string, defaultValue?: GenericValue) => {
  const core = useKibanaCore();
  const uiSettingsClient = core.uiSettings;
  const uiInjectedMetadata = core.injectedMetadata;

  if (key === DEFAULT_KBN_VERSION) {
    return [uiInjectedMetadata.getKibanaVersion()];
  }

  /* eslint-disable react-hooks/rules-of-hooks */
  if (key === DEFAULT_TIMEZONE_BROWSER) {
    return [useMemo(() => timezoneProvider(uiSettingsClient)(), [uiSettingsClient])];
  }

  const uiSetting$ = useMemo(() => uiSettingsClient.get$(key, defaultValue), [uiSettingsClient]);
  const uiSetting = useObservable(uiSetting$);
  const setUiSetting = useCallback((value: GenericValue) => uiSettingsClient.set(key, value), [
    uiSettingsClient,
  ]);
  /* eslint-enable react-hooks/rules-of-hooks */

  return [uiSetting, setUiSetting];
};
