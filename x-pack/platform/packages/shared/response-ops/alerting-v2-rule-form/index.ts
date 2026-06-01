/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pre-composed flyouts (lazy loaded) - recommended for most use cases
export { DynamicRuleFormFlyout } from './flyout';

// Compose Discover flyout — stepped Edit Form + Discover Sandbox
export { ComposeDiscoverFlyout } from './flyout/compose_discover';
export type { ComposeDiscoverFlyoutProps } from './flyout/compose_discover';
export type { ComposeDiscoverMode } from './flyout/compose_discover/types';

// Rule Builder registry
export { RULE_BUILDER_REGISTRY } from './flyout/compose_discover/rule_builder';
export type { BuilderState } from './flyout/compose_discover/rule_builder';

// Compose Discover sandbox — embeddable ES|QL editor + results panel (props-only)
export { QuerySandboxFlyout } from './flyout/compose_discover';
export type { QuerySandboxFlyoutProps, QueryTab } from './flyout/compose_discover';

// Lazy components (without Suspense wrapper) - for consumers who need full control
export { LazyDynamicRuleFormFlyout, LazyRuleFormFlyout } from './flyout';

// Constants
export { RULE_FORM_ID, DEFAULT_RULE_NAME } from './form/constants';

// Form components (lazy loaded) - for embedding in custom forms
export { DynamicRuleForm } from './form';

// Preview component (lazy loaded) - for displaying rule query results preview
export { RuleResultsPreview } from './form';

// Context - for consumers who need custom integrations
export { RuleFormProvider, useRuleFormServices, useRuleFormMeta } from './form';

// Mappers
export {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
  mapFormValuesToRuleRequest,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
  mapRuleResponseToFormValues,
} from './form';

// Field groups — for composing custom form layouts
export {
  RuleDetailsFieldGroup,
  ConditionFieldGroup,
  RuleExecutionFieldGroup,
  AlertConditionsFieldGroup,
  KindField,
} from './form';

// Types
export type {
  FormValues,
  StateTransitionDelayMode,
  DynamicRuleFormProps,
  RuleFormServices,
  RuleFormMeta,
  RuleFormLayout,
  RuleRequestCommon,
  WorkflowFormComponentProps,
  RuleNotificationsValue,
} from './form';
export { NOOP_WORKFLOW_FORM } from './form';

export type { RuleFormFlyoutProps, DynamicRuleFormFlyoutProps } from './flyout';
