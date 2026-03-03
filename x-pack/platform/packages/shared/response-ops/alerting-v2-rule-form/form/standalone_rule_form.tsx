/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import type { FormValues } from './types';
import { RuleForm } from './rule_form';
import type { RuleFormServices } from './contexts';
import { useFormDefaults } from './hooks/use_form_defaults';

export interface StandaloneRuleFormProps {
  /** Initial query for the rule */
  query: string;
  services: RuleFormServices;
  onSubmit: (values: FormValues) => void;
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
}

/**
 * Standalone rule form with static initialization.
 *
 * Use this component for a classic flyout experience where the user controls
 * everything from the form after initial mount. External prop changes are ignored.
 *
 * Uses react-hook-form's `defaultValues` for static initialization.
 * Time field is auto-selected by TimeFieldSelect based on available date fields.
 */
export const StandaloneRuleForm: React.FC<StandaloneRuleFormProps> = ({
  query,
  services,
  onSubmit,
  includeYaml = false,
  isDisabled = false,
  isSubmitting = false,
  includeSubmission = false,
  onCancel,
  submitLabel,
  cancelLabel,
}) => {
  const defaultValues = useFormDefaults({ query });

  const methods = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <RuleForm
        services={services}
        onSubmit={onSubmit}
        includeYaml={includeYaml}
        isDisabled={isDisabled}
        isSubmitting={isSubmitting}
        includeSubmission={includeSubmission}
        onCancel={onCancel}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
      />
    </FormProvider>
  );
};
