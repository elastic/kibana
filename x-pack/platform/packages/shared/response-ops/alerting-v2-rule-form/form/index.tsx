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

export const DynamicRuleForm = (props: DynamicRuleFormProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyDynamicRuleForm {...props} />
  </Suspense>
);

export const StandaloneRuleForm = (props: StandaloneRuleFormProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyStandaloneRuleForm {...props} />
  </Suspense>
);

// Lazy load preview component
const LazyRuleResultsPreview = React.lazy(() =>
  import('./fields/rule_results_preview').then((module) => ({
    default: module.RuleResultsPreview,
  }))
);

export const RuleResultsPreview = () => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyRuleResultsPreview />
  </Suspense>
);

export type { FormValues, StateTransitionDelayMode } from './types';
export type { DynamicRuleFormProps } from './dynamic_rule_form';
export type { StandaloneRuleFormProps } from './standalone_rule_form';
export type { RuleFormServices, RuleFormMeta, RuleFormLayout } from './contexts';
export { RuleFormProvider, useRuleFormServices, useRuleFormMeta } from './contexts';
export {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
  mapFormValuesToRuleRequest,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
  mapRuleResponseToFormValues,
} from './utils/rule_request_mappers';
export type { RuleRequestCommon } from './utils/rule_request_mappers';

export { ConditionFieldGroup } from './field_groups/condition_field_group';
export { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
export { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
export { RulePreviewPanel } from './fields/rule_preview_panel';
export { GroupFieldSelect } from './fields/group_field_select';
export { SubmissionButtons } from './components/submission_buttons';
export type { SubmissionButtonsProps } from './components/submission_buttons';
export { ErrorCallOut } from './error_callout';
export { useFormDefaults } from './hooks/use_form_defaults';
