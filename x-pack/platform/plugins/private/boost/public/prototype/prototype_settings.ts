/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { BOOST_PROTOTYPE_SETTINGS_API_PATH } from '../../common/constants';
import type { PrototypeSettings } from '../../common/prototype_settings';
import { DEFAULT_PROTOTYPE_SETTINGS } from '../../common/prototype_settings';

// The prototype menu, the boost app, and its parts in Index Management render apart from each other,
// so they all follow the settings through here. They're off until loaded.
let settings: PrototypeSettings = DEFAULT_PROTOTYPE_SETTINGS;
let settingsHttp: HttpStart | undefined;

const listeners = new Set<() => void>();

const setSettings = (nextSettings: PrototypeSettings) => {
  settings = nextSettings;
  listeners.forEach((listener) => listener());
};

let loading: Promise<void> | undefined;

/**
 * Loads the settings everyone testing the prototype shares, once per page load, as each part of
 * the prototype that follows them loads. Until then, and if they can't load, they're off.
 */
export const loadPrototypeSettings = (http: HttpStart): Promise<void> => {
  if (!loading) {
    settingsHttp = http;
    loading = http
      .get<PrototypeSettings>(BOOST_PROTOTYPE_SETTINGS_API_PATH)
      .then(setSettings)
      .catch(() => {});
  }
  return loading;
};

export const getPrototypeSettings = (): PrototypeSettings => settings;

/**
 * Changes some of the settings for everyone, showing the change here right away. If it can't be
 * saved, what it changed goes back to what it was, and the error is thrown. Responses don't replace
 * the settings, since one can arrive after a later change.
 */
export const setPrototypeSettings = async (changes: Partial<PrototypeSettings>): Promise<void> => {
  const previousValues = Object.fromEntries(
    Object.keys(changes).map((key) => [key, settings[key as keyof PrototypeSettings]])
  );
  setSettings({ ...settings, ...changes });
  if (!settingsHttp) {
    return;
  }
  try {
    await settingsHttp.put(BOOST_PROTOTYPE_SETTINGS_API_PATH, { body: JSON.stringify(changes) });
  } catch (error) {
    setSettings({ ...settings, ...previousValues });
    throw error;
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The prototype menu's settings, following any change to them. */
export const usePrototypeSettings = (): PrototypeSettings =>
  useSyncExternalStore(subscribe, getPrototypeSettings);

/** Whether to show search cost and VCU estimates, following the prototype menu's setting. */
export const useShowsEstimates = (): boolean => usePrototypeSettings().shows_estimates;

/** Whether a rule can select several indices or data streams, following the prototype menu. */
export const useAllowsMultipleTargets = (): boolean =>
  usePrototypeSettings().allows_multiple_targets;
