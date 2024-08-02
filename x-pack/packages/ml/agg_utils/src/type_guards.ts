/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { SignificantItem, SignificantItemGroup } from './types';

/**
 * Type guard for a significant item.
 * Note this is used as a custom type within Log Rate Analysis
 * for a p-value based variant, not a generic significant terms
 * aggregation type.
 * @param arg The unknown type to be evaluated
 * @returns Return whether arg is of type SignificantItem
 */
export function isSignificantItem(arg: unknown): arg is SignificantItem {
  return isPopulatedObject(arg, [
    'key',
    'type',
    'fieldName',
    'fieldValue',
    'doc_count',
    'bg_count',
    'total_doc_count',
    'total_bg_count',
    'score',
    'pValue',
    'normalizedScore',
  ]);
}
/**
 * Type guard to check if the given argument is a SignificantItemGroup.
 * @param arg The unknown type to be evaluated
 * @returns Return whether arg is of type SignificantItemGroup
 */
export function isSignificantItemGroup(arg: unknown): arg is SignificantItemGroup {
  return isPopulatedObject(arg, ['id', 'group', 'docCount', 'pValue']);
}
