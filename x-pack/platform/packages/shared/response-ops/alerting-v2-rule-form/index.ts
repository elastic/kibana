/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pre-composed flyouts (lazy loaded) - recommended for most use cases
export { DynamicRuleFormFlyout, StandaloneRuleFormFlyout } from './flyout';

// Form components (lazy loaded) - for embedding in custom forms
export { RuleFields, DynamicRuleForm, StandaloneRuleForm } from './form';

// Types
export type {
  FormValues,
  DynamicRuleFormProps,
  StandaloneRuleFormProps,
  RuleFormServices,
} from './form';

export type {
  RuleFormFlyoutProps,
  RuleFormFlyoutServices,
  DynamicRuleFormFlyoutProps,
  StandaloneRuleFormFlyoutProps,
} from './flyout';
