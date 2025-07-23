/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/alerts-as-data-utils';
import { flattenObject } from '@kbn/object-utils';
import { Group, GroupingObject } from './types';

export const getEcsGroups = (groups: Group[] = []): Record<string, string | string[]> => {
  const ecsGroup: Record<string, string | string[]> = {};

  groups.forEach((group) => {
    const path = group.field;
    const ecsField = ecsFieldMap[path];
    if (!ecsField) return;

    // we only allow keyword group values
    if (ecsField.type !== 'keyword') return;

    if (!ecsField.array) {
      // if the ecs type is not an array, assign the value
      ecsGroup[path] = group.value;
    } else {
      // otherwise the ecs type is an array, create a 1-element array
      ecsGroup[path] = [group.value];
    }
  });
  return ecsGroup;
};

export const getEcsGroupings = (groupings: GroupingObject): Record<string, string | string[]> => {
  const ecsGroup: Record<string, string | string[]> = {};
  const flattenGroupings = flattenObject(groupings ?? {});

  Object.entries(flattenGroupings).forEach(([key, value]) => {
    const ecsField = ecsFieldMap[key];
    if (!ecsField) return;

    // we only allow keyword group values
    if (ecsField.type !== 'keyword') return;

    if (!ecsField.array) {
      // if the ecs type is not an array, assign the value
      ecsGroup[key] = String(value);
    } else {
      // otherwise the ecs type is an array, create a 1-element array
      ecsGroup[key] = [String(value)];
    }
  });

  return ecsGroup;
};
