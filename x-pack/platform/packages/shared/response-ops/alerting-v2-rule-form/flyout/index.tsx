/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RuleFormFlyoutProps } from './rule_form_flyout';
import type { DynamicRuleFormFlyoutProps } from './dynamic_rule_form_flyout';
import type { StandaloneRuleFormFlyoutProps } from './standalone_rule_form_flyout';
import type { ComposeDiscoverFlyoutProps } from './compose_discover';

// Lazy load flyout components
const LazyRuleFormFlyout = React.lazy(() =>
  import('./rule_form_flyout').then((module) => ({
    default: module.RuleFormFlyout,
  }))
);

const LazyDynamicRuleFormFlyout = React.lazy(() =>
  import('./dynamic_rule_form_flyout').then((module) => ({
    default: module.DynamicRuleFormFlyout,
  }))
);

const LazyStandaloneRuleFormFlyout = React.lazy(() =>
  import('./standalone_rule_form_flyout').then((module) => ({
    default: module.StandaloneRuleFormFlyout,
  }))
);

const LazyComposeDiscoverFlyout = React.lazy(() =>
  import('./compose_discover').then((module) => ({
    default: module.ComposeDiscoverFlyout,
  }))
);

// Export lazy components directly for consumers who need full control over Suspense
export {
  LazyDynamicRuleFormFlyout,
  LazyStandaloneRuleFormFlyout,
  LazyRuleFormFlyout,
  LazyComposeDiscoverFlyout,
};

/** Base flyout wrapper - use with DynamicRuleForm or StandaloneRuleForm as children */
export const RuleFormFlyout = (props: RuleFormFlyoutProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <LazyRuleFormFlyout {...props} />
  </Suspense>
);

/** Pre-composed flyout for Discover integration - syncs with external query changes */
export const DynamicRuleFormFlyout = (props: DynamicRuleFormFlyoutProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <LazyDynamicRuleFormFlyout {...props} />
  </Suspense>
);

/** Pre-composed flyout for classic experience - static initialization */
export const StandaloneRuleFormFlyout = (props: StandaloneRuleFormFlyoutProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <LazyStandaloneRuleFormFlyout {...props} />
  </Suspense>
);

/** Compose Discover flyout — two-layer flyout with compact rule form + Discover child */
export const ComposeDiscoverFlyout = (props: ComposeDiscoverFlyoutProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <LazyComposeDiscoverFlyout {...props} />
  </Suspense>
);

// Export types
export type { RuleFormFlyoutProps } from './rule_form_flyout';
export type { DynamicRuleFormFlyoutProps } from './dynamic_rule_form_flyout';
export type { StandaloneRuleFormFlyoutProps } from './standalone_rule_form_flyout';
export type { ComposeDiscoverFlyoutProps } from './compose_discover';
export type * from '../form/types';
