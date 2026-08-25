/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FollowerIndexAdvancedSettings } from '../../../common/types';
import { FOLLOWER_INDEX_ADVANCED_SETTINGS } from '../../../common/constants';

type FollowerIndexAdvancedSettingName = keyof typeof FOLLOWER_INDEX_ADVANCED_SETTINGS;
type SettingDefaultValue =
  (typeof FOLLOWER_INDEX_ADVANCED_SETTINGS)[FollowerIndexAdvancedSettingName];

export const getSettingDefault = (name: FollowerIndexAdvancedSettingName): SettingDefaultValue => {
  if (!Object.prototype.hasOwnProperty.call(FOLLOWER_INDEX_ADVANCED_SETTINGS, name)) {
    throw new Error(`Unknown setting ${name}`);
  }

  return FOLLOWER_INDEX_ADVANCED_SETTINGS[name];
};

/**
 * A setting is considered default when it is `undefined` (the user has not
 * entered a value) or when the entered value equals the documented default.
 */
export const isSettingDefault = (
  name: FollowerIndexAdvancedSettingName,
  value: SettingDefaultValue | undefined
): boolean => {
  return value === undefined || getSettingDefault(name) === value;
};

export const areAllSettingsDefault = (settings: FollowerIndexAdvancedSettings): boolean => {
  return (
    Object.keys(FOLLOWER_INDEX_ADVANCED_SETTINGS) as FollowerIndexAdvancedSettingName[]
  ).every((name) => isSettingDefault(name, settings[name]));
};
