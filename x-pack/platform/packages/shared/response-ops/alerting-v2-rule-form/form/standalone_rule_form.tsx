/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type ReactNode } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import type { FormValues } from './types';
import { RuleForm } from './rule_form';
import type { RuleFormServices, RuleFormLayout } from './contexts';
import { useFormDefaults } from './hooks/use_form_defaults';

export interface StandaloneRuleFormProps {
  /** Initial query for the rule */
  query: string;
  services: RuleFormServices;
  /** Layout mode: 'page' renders the preview side-by-side; 'flyout' uses a nested flyout. Default: 'page'. */
  layout?: RuleFormLayout;
  /**
   * External submit handler. When provided, form submission delegates to this callback.
   * When omitted (and `includeSubmission` is true), the form uses `useCreateRule` internally.
   */
  onSubmit?: (values: FormValues) => void;
  /** Callback invoked after a successful internal submission (useCreateRule). */
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Whether the form is currently submitting (controls button loading state) */
  isSubmitting?: boolean;
  /** Whether to show submit/cancel buttons (default: false) */
  includeSubmission?: boolean;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /**
   * Optional initial form values to populate the form with (e.g. when editing an existing rule).
   * These are shallow-merged over the query-derived defaults.
   */
  initialValues?: Partial<FormValues>;
  /** When provided, the form operates in edit mode and uses PATCH instead of POST on submission. */
  ruleId?: string;
  /** Optional controls for the Rule evaluation section header (e.g. switch from ES|QL entry to a builder). */
  ruleEvaluationHeaderActions?: ReactNode;
  /** When false, hides the ES|QL editor (for example threshold builder mode). Default: true. */
  includeQueryEditor?: boolean;
  /** Create-rule URL builder deep link (for example `threshold_alert`). */
  ruleBuilderId?: string;
  /** Badge text for the Rule evaluation section (builder name or ES|QL). */
  ruleEvaluationModeLabel?: string;
}

/**
 * Standalone rule form with static initialization.
 *
 * Use this component for a classic flyout experience where the user controls
 * everything from the form after initial mount. External prop changes are ignored.
 *
 * When `onSubmit` is provided, form submission delegates to that callback.
 * When `onSubmit` is omitted and `includeSubmission` is true, the form
 * automatically persists the rule via the API and calls `onSuccess` afterwards.
 * If `ruleId` is provided the internal submission uses PATCH (update) instead of POST (create).
 *
 * Uses react-hook-form's `defaultValues` for static initialization.
 * Time field is auto-selected by TimeFieldSelect based on available date fields.
 */
export const StandaloneRuleForm = ({
  query,
  services,
  layout,
  onSubmit,
  onSuccess,
  isSubmitting = false,
  includeSubmission = false,
  onCancel,
  submitLabel,
  cancelLabel,
  initialValues,
  ruleId,
  ruleEvaluationHeaderActions,
  includeQueryEditor = true,
  ruleBuilderId,
  ruleEvaluationModeLabel,
}: StandaloneRuleFormProps) => {
  const queryDefaults = useFormDefaults({ query });

  const defaultValues = useMemo<FormValues>(
    () => ({
      ...queryDefaults,
      ...initialValues,
      metadata: {
        ...queryDefaults.metadata,
        ...initialValues?.metadata,
      },
      schedule: {
        ...queryDefaults.schedule,
        ...initialValues?.schedule,
      },
      evaluation: {
        ...queryDefaults.evaluation,
        query: {
          ...queryDefaults.evaluation.query,
          ...initialValues?.evaluation?.query,
        },
      },
      ...(initialValues?.grouping !== undefined ? { grouping: initialValues.grouping } : {}),
      ...(initialValues?.recoveryPolicy !== undefined
        ? { recoveryPolicy: initialValues.recoveryPolicy }
        : {}),
      ...(initialValues?.stateTransition !== undefined
        ? { stateTransition: initialValues.stateTransition }
        : {}),
      stateTransitionAlertDelayMode:
        initialValues?.stateTransitionAlertDelayMode ?? queryDefaults.stateTransitionAlertDelayMode,
      stateTransitionRecoveryDelayMode:
        initialValues?.stateTransitionRecoveryDelayMode ??
        queryDefaults.stateTransitionRecoveryDelayMode,
      ...(initialValues?.thresholdStats !== undefined
        ? { thresholdStats: initialValues.thresholdStats }
        : {}),
      ...(initialValues?.thresholdDataSource !== undefined
        ? { thresholdDataSource: initialValues.thresholdDataSource }
        : {}),
      ...(ruleBuilderId === 'threshold_alert'
        ? {
            thresholdConditionCombinator: initialValues?.thresholdConditionCombinator ?? 'and',
            thresholdConditions: initialValues?.thresholdConditions ?? [
              { statLabel: '', operator: 'gt', value: '' },
            ],
          }
        : {}),
    }),
    [queryDefaults, initialValues, ruleBuilderId]
  );

  const methods = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <RuleForm
        services={services}
        layout={layout}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        isSubmitting={isSubmitting}
        includeSubmission={includeSubmission}
        onCancel={onCancel}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        ruleId={ruleId}
        ruleEvaluationHeaderActions={ruleEvaluationHeaderActions}
        includeQueryEditor={includeQueryEditor}
        ruleBuilderId={ruleBuilderId}
        ruleEvaluationModeLabel={ruleEvaluationModeLabel}
      />
    </FormProvider>
  );
};
