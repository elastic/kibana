/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenObject } from '@kbn/object-utils';
import { Group } from './types';

// TODO: Remove after updating the group logic in the log threshold rule
// https://github.com/elastic/kibana/issues/220006
export const getGroupByObject = (
  groupBy: string | string[] | undefined,
  groupValueSet: Set<string>
): Record<string, unknown> => {
  const groupKeyValueMappingsObject: Record<string, unknown> = {};
  if (groupBy) {
    groupValueSet.forEach((groupValueStr) => {
      const groupValueArray = groupValueStr.split(',');
      groupKeyValueMappingsObject[groupValueStr] = unflattenObject(
        Array.isArray(groupBy)
          ? groupBy.reduce((result, groupKey, index) => {
              return { ...result, [groupKey]: groupValueArray[index]?.trim() };
            }, {})
          : { [groupBy]: groupValueStr }
      );
    });
  }
  return groupKeyValueMappingsObject;
};

export const unflattenGrouping = (
  grouping?: Record<string, string> | undefined
): Record<string, any> | undefined => {
  if (grouping) {
    return unflattenObject(grouping);
  }
};

// TODO: Remove after updating the group logic in the log threshold rule
// https://github.com/elastic/kibana/issues/220006
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

export const getFormattedGroups = (grouping?: Record<string, string>): Group[] | undefined => {
  const groups: Group[] = [];
  if (grouping) {
    const groupKeys = Object.keys(grouping);
    groupKeys.forEach((group) => {
      groups.push({ field: group, value: grouping[group] });
    });
  }
  return groups.length ? groups : undefined;
};
