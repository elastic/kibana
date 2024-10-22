/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function pValueToLabel(pValue: number): 'high' | 'medium' | 'low' {
  if (pValue < 0.01) {
    return 'high';
  } else if (pValue < 0.05) {
    return 'medium';
  } else {
    return 'low';
  }
}
