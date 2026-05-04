/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedPolicy } from '../../../common/types';
import { defaultRolloverAction } from '../constants';

const isKeyOf = <T extends object>(obj: T, key: PropertyKey): key is keyof T => key in obj;

export const isUsingDefaultRollover = (policy: SerializedPolicy): boolean => {
  const rollover = policy?.phases?.hot?.actions?.rollover;
  if (!rollover) {
    return false;
  }

  // "Use recommended defaults" should only be enabled when the rollover action
  // matches the default rollover settings exactly, with no additional thresholds.
  const rolloverKeys = Object.keys(rollover);
  const hasOnlyDefaultKeys = rolloverKeys.every((key) => isKeyOf(defaultRolloverAction, key));
  if (!hasOnlyDefaultKeys) {
    return false;
  }

  const defaultKeys = Object.keys(defaultRolloverAction);
  const hasAllDefaultKeysWithSameValues = defaultKeys.every((key) => {
    if (!isKeyOf(defaultRolloverAction, key)) {
      return false;
    }

    return rollover[key] === defaultRolloverAction[key];
  });

  return rolloverKeys.length === defaultKeys.length && hasAllDefaultKeysWithSameValues;
};
