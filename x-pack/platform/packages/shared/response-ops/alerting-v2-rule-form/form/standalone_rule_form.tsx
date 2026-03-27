/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
  /** Whether to include YAML editor toggle (default: false). Requires services.application. */
  includeYaml?: boolean;
  /** Whether the form is in a loading/disabled state */
  isDisabled?: boolean;
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
  includeYaml = false,
  isDisabled = false,
  isSubmitting = false,
  includeSubmission = false,
  onCancel,
  submitLabel,
  cancelLabel,
  initialValues,
  ruleId,
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
    }),
    [queryDefaults, initialValues]
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
        includeYaml={includeYaml}
        isDisabled={isDisabled}
        isSubmitting={isSubmitting}
        includeSubmission={includeSubmission}
        onCancel={onCancel}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        ruleId={ruleId}
      />
    </FormProvider>
  );
};
