/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiProgress } from '@elastic/eui';
import React from 'react';

// TODO: extend from EUI's EuiProgress prop interface
export interface ImpactBarProps extends Record<string, unknown> {
  value: number;
  max?: number;
}

export function ImpactBar({ value, max = 100, ...rest }: ImpactBarProps) {
  return (
    <EuiProgress size="l" value={value} max={max} color="primary" {...rest} />
  );
}
