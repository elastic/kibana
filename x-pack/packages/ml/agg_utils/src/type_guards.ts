/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { SignificantTerm } from './types';

/**
 * Type guard for a significant term.
 * Note this is used as a custom type within Log Rate Analysis
 * for a p-value based variant, not a generic significant terms
 * aggregation type.
 * @param arg The unknown type to be evaluated
 * @returns whether arg is of type SignificantTerm
 */
export function isSignificantTerm(arg: unknown): arg is SignificantTerm {
  return isPopulatedObject(arg, [
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
