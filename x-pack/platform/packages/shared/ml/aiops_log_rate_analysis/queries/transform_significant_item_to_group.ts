/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringHash } from '@kbn/ml-string-hash';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';

import type { SignificantItemDuplicateGroup } from '../types';
import { getFieldValuePairKey } from './get_field_value_pair_key';

export function getGroupedSignificantItemsByPairKey(
  groupedSignificantItems: SignificantItemDuplicateGroup[]
): Map<string, SignificantItemDuplicateGroup> {
  const groupedSignificantItemsByPairKey = new Map<string, SignificantItemDuplicateGroup>();

  for (const groupedSignificantItem of groupedSignificantItems) {
    for (const duplicateSignificantItem of groupedSignificantItem.group) {
      groupedSignificantItemsByPairKey.set(
        getFieldValuePairKey(
          duplicateSignificantItem.fieldName,
          duplicateSignificantItem.fieldValue
        ),
        groupedSignificantItem
      );
    }
  }

  return groupedSignificantItemsByPairKey;
}

export function transformSignificantItemToGroup(
  significantItem: SignificantItem,
  groupedSignificantItems: SignificantItemDuplicateGroup[],
  groupedSignificantItemsByPairKey?: Map<string, SignificantItemDuplicateGroup>
): SignificantItemGroup {
  const { key, type, fieldName, fieldValue, doc_count: docCount, pValue } = significantItem;

  const duplicates =
    groupedSignificantItemsByPairKey?.get(getFieldValuePairKey(fieldName, fieldValue)) ??
    groupedSignificantItems.find((d) =>
      d.group.some((dg) => dg.fieldName === fieldName && dg.fieldValue === fieldValue)
    );

  if (duplicates !== undefined) {
    return {
      id: `${stringHash(
        JSON.stringify(
          duplicates.group.map((d) => ({
            fieldName: d.fieldName,
            fieldValue: d.fieldValue,
          }))
        )
      )}`,
      group: duplicates.group.map((d) => ({
        key: d.key,
        type: d.type,
        fieldName: d.fieldName,
        fieldValue: d.fieldValue,
        duplicate: 1,
        docCount,
        pValue,
      })),
      docCount,
      pValue,
    };
  } else {
    return {
      id: `${stringHash(JSON.stringify({ fieldName, fieldValue }))}`,
      group: [
        {
          key,
          type,
          fieldName,
          fieldValue,
          duplicate: 1,
          docCount,
          pValue,
        },
      ],
      docCount,
      pValue,
    };
  }
}
