/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RuleFormFlyoutProps } from './rule_form_flyout';

const LazyRuleFormFlyout = React.lazy(() =>
  import('./rule_form_flyout').then((module) => ({
    default: module.RuleFormFlyout,
  }))
);

export const RuleFormFlyout: React.FC<RuleFormFlyoutProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <LazyRuleFormFlyout {...props} />
  </Suspense>
);

export type * from '../form/types';
