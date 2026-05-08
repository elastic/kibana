/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pre-composed flyouts (lazy loaded) - recommended for most use cases
export { DynamicRuleFormFlyout, StandaloneRuleFormFlyout } from './flyout';

// Lazy components (without Suspense wrapper) - for consumers who need full control
export {
  LazyDynamicRuleFormFlyout,
  LazyStandaloneRuleFormFlyout,
  LazyRuleFormFlyout,
} from './flyout';

// Constants
export { RULE_FORM_ID, DEFAULT_RULE_NAME } from './form/constants';

// Form components (lazy loaded) - for embedding in custom forms
export { DynamicRuleForm, StandaloneRuleForm } from './form';

// Preview component (lazy loaded) - for displaying rule query results preview
export { RuleResultsPreview } from './form';

// Context - for consumers who need custom integrations
export { RuleFormProvider, useRuleFormServices, useRuleFormMeta } from './form';

export {
  KindField,
  AlertConditionsFieldGroup,
  AttachmentRunbookFieldGroup,
  RuleDetailsFieldGroup,
  RuleExecutionFieldGroup,
} from './form';

export { QueryResultsGrid } from './form';
export type { QueryResultsGridProps } from './form';

export { ShowRequestModal } from './form';
export type { BuildRequestBody } from './form';

// Mappers
export {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
  mapFormValuesToRuleRequest,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
  mapRuleResponseToFormValues,
} from './form';

export { useDataFields, getTimeFieldOptions } from './form';

// Types
export type {
  FormValues,
  StateTransitionDelayMode,
  RecoveryPolicy,
  StateTransition,
  RuleArtifact,
  DynamicRuleFormProps,
  StandaloneRuleFormProps,
  RuleFormServices,
  RuleFormMeta,
  RuleFormLayout,
  RuleRequestCommon,
} from './form';

export type {
  RuleFormFlyoutProps,
  DynamicRuleFormFlyoutProps,
  StandaloneRuleFormFlyoutProps,
} from './flyout';
