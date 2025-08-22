/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const P_VALUE_SIGNIFICANCE_HIGH = 1e-6;
export const P_VALUE_SIGNIFICANCE_MEDIUM = 0.001;

export function pValueToLabel(pValue: number): 'high' | 'medium' | 'low' {
  if (pValue <= P_VALUE_SIGNIFICANCE_HIGH) {
    return 'high';
  } else if (pValue <= P_VALUE_SIGNIFICANCE_MEDIUM) {
    return 'medium';
  } else {
    return 'low';
  }
}
