/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RuleFieldsProps } from './rule_fields';

const LazyRuleFields = React.lazy(() =>
  import('./rule_fields').then((module) => ({
    default: module.RuleFields,
  }))
);

export const RuleFields: React.FC<RuleFieldsProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyRuleFields {...props} />
  </Suspense>
);

export type { FormValues } from './types';
