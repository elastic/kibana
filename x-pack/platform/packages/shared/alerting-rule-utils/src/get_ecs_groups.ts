/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/alerts-as-data-utils';
import type { Group } from './types';

const getEcsValue = (field: string, value: unknown): string | string[] | undefined => {
  if (typeof value !== 'string') return;
  const ecsField = ecsFieldMap[field];
  if (!ecsField) return;

  // we only allow keyword group values
  if (ecsField.type !== 'keyword') return;

  if (!ecsField.array) {
    // if the ecs type is not an array, assign the value
    return value;
  } else {
    // otherwise the ecs type is an array, create a 1-element array
    return [value];
  }
};

export const getEcsGroups = (groups: Group[] = []): Record<string, string | string[]> => {
  const ecsGroup: Record<string, string | string[]> = {};

  groups.forEach((group) => {
    const ecsValue = getEcsValue(group.field, group.value);
    if (ecsValue) {
      ecsGroup[group.field] = ecsValue;
    }
  });

  return ecsGroup;
};

export const getEcsGroupsFromFlattenGrouping = (
  flattenGrouping: Record<string, unknown> = {}
): Record<string, string | string[]> => {
  const ecsGroup: Record<string, string | string[]> = {};

  Object.keys(flattenGrouping).forEach((flattenGroup) => {
    const ecsValue = getEcsValue(flattenGroup, flattenGrouping[flattenGroup]);
    if (ecsValue) {
      ecsGroup[flattenGroup] = ecsValue;
    }
  });
  return ecsGroup;
};
