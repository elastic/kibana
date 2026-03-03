/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { DynamicRuleFormProps } from './dynamic_rule_form';
import type { StandaloneRuleFormProps } from './standalone_rule_form';

// Lazy load form components
const LazyDynamicRuleForm = React.lazy(() =>
  import('./dynamic_rule_form').then((module) => ({
    default: module.DynamicRuleForm,
  }))
);

const LazyStandaloneRuleForm = React.lazy(() =>
  import('./standalone_rule_form').then((module) => ({
    default: module.StandaloneRuleForm,
  }))
);

export const DynamicRuleForm: React.FC<DynamicRuleFormProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyDynamicRuleForm {...props} />
  </Suspense>
);

export const StandaloneRuleForm: React.FC<StandaloneRuleFormProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyStandaloneRuleForm {...props} />
  </Suspense>
);

export type { FormValues } from './types';
export type { DynamicRuleFormProps } from './dynamic_rule_form';
export type { StandaloneRuleFormProps } from './standalone_rule_form';
export type { RuleFormServices } from './contexts';
export { RuleFormServicesProvider, useRuleFormServices } from './contexts';
