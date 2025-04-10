/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { Group, FieldsObject } from './types';

export const unflattenObject = <T extends object = FieldsObject>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

export const flattenObject = (obj: FieldsObject, prefix: string = ''): FieldsObject =>
  Object.keys(obj).reduce<FieldsObject>((acc, key) => {
    const nextValue = obj[key];

    if (nextValue) {
      if (typeof nextValue === 'object' && !Array.isArray(nextValue)) {
        const dotSuffix = '.';
        if (Object.keys(nextValue).length > 0) {
          return {
            ...acc,
            ...flattenObject(nextValue, `${prefix}${key}${dotSuffix}`),
          };
        }
      }

      const fullPath = `${prefix}${key}`;
      acc[fullPath] = nextValue;
    }

    return acc;
  }, {});

export const getGroupByObject = (
  groupBy: string | string[] | undefined,
  resultGroupSet: Set<string>
): Record<string, object> => {
  const groupByKeysObjectMapping: Record<string, object> = {};
  if (groupBy) {
    resultGroupSet.forEach((groupSet) => {
      const groupSetKeys = groupSet.split(',');
      groupByKeysObjectMapping[groupSet] = unflattenObject(
        Array.isArray(groupBy)
          ? groupBy.reduce((result, group, index) => {
              return { ...result, [group]: groupSetKeys[index]?.trim() };
            }, {})
          : { [groupBy]: groupSet }
      );
    });
  }
  return groupByKeysObjectMapping;
};

export const getFormattedGroupBy = (
  groupBy: string | string[] | undefined,
  groupSet: Set<string>
): Record<string, Group[]> => {
  const groupByKeysObjectMapping: Record<string, Group[]> = {};
  if (groupBy) {
    groupSet.forEach((group) => {
      const groupSetKeys = group.split(',');
      groupByKeysObjectMapping[group] = Array.isArray(groupBy)
        ? groupBy.reduce((result: Group[], groupByItem, index) => {
            result.push({ field: groupByItem, value: groupSetKeys[index]?.trim() });
            return result;
          }, [])
        : [{ field: groupBy, value: group }];
    });
  }
  return groupByKeysObjectMapping;
};
