/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/alerts-as-data-utils';

export interface Group {
  field: string;
  value: string;
}

export const getEcsGroups = (groups: Group[] = []): Record<string, string> => {
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

  const ecsGroup: Record<string, string> = {};

  ecsGroups.forEach((group) => {
    ecsGroup[group.field] = group.value;
  });

  return ecsGroup;
};
