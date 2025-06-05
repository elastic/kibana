/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/alerts-as-data-utils';
import { Group } from './types';

export const getEcsGroups = (groups: Group[] = []): Record<string, string | string[]> => {
  const ecsGroups = groups.filter((group) => {
    const path = group.field;
    const ecsField = ecsFieldMap[path as keyof typeof ecsFieldMap];

    if (!Boolean(!!ecsField)) {
      return false;
    }

    // we only allow keyword group values
    if (ecsField.type !== 'keyword') {
      return false;
    }

    return true;
  });

  const ecsGroup: Record<string, string | string[]> = {};

  ecsGroups.forEach((group) => {
    const path = group.field;
    const ecsField = ecsFieldMap[path as keyof typeof ecsFieldMap];

    if (!ecsField.array) {
      // if the ecs type is not an array, assign the value
      ecsGroup[group.field] = group.value;
    } else {
      // otherwise the ecs type is an array, create a 1-element array
      ecsGroup[group.field] = [group.value];
    }
  });

  return ecsGroup;
};
