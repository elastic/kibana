/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pre-composed flyouts (lazy loaded) - recommended for most use cases
export { DynamicRuleFormFlyout, StandaloneRuleFormFlyout, RULE_FORM_ID } from './flyout';

// Form components (lazy loaded) - for embedding in custom forms
export { DynamicRuleForm, StandaloneRuleForm } from './form';

// Context - for consumers who need custom integrations
export { RuleFormServicesProvider, useRuleFormServices } from './form';

// Types
export type {
  FormValues,
  DynamicRuleFormProps,
  StandaloneRuleFormProps,
  RuleFormServices,
} from './form';

export type {
  RuleFormFlyoutProps,
  DynamicRuleFormFlyoutProps,
  StandaloneRuleFormFlyoutProps,
} from './flyout';
