/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { DynamicRuleFormProps } from './dynamic_rule_form';

// Lazy load form components
const LazyDynamicRuleForm = React.lazy(() =>
  import('./dynamic_rule_form').then((module) => ({
    default: module.DynamicRuleForm,
  }))
);

export const DynamicRuleForm = (props: DynamicRuleFormProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyDynamicRuleForm {...props} />
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

export type {
  FormValues,
  StateTransitionDelayMode,
  WorkflowFormComponentProps,
  RuleNotificationsValue,
} from './types';
export type { DynamicRuleFormProps } from './dynamic_rule_form';
export type { RuleFormServices, RuleFormMeta, RuleFormLayout } from './contexts';
export {
  RuleFormProvider,
  useRuleFormServices,
  useRuleFormMeta,
  NOOP_WORKFLOW_FORM,
} from './contexts';
export {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
  mapFormValuesToRuleRequest,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
  mapRuleResponseToFormValues,
} from './utils/rule_request_mappers';
export type { RuleRequestCommon } from './utils/rule_request_mappers';

// Field groups — for composing custom form layouts
export { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
export { ConditionFieldGroup } from './field_groups/condition_field_group';
export { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
export { AlertConditionsFieldGroup } from './field_groups/alert_conditions_field_group';
export { KindField } from './fields/kind_field';
