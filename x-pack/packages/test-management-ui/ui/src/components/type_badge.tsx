/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestType } from '../types.js';

const TYPE_LABELS: Record<string, string> = {
  jest: 'Jest',
  'jest-integration': 'Jest Int.',
  scout: 'Scout',
  ftr: 'FTR',
};

interface TypeBadgeProps {
  type: TestType;
}

export const TypeBadge = ({ type }: TypeBadgeProps) => (
  <span className={`config-type-badge type-${type}`}>{TYPE_LABELS[type] ?? type}</span>
);
