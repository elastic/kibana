/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { FormValues } from './types';
import { RuleForm, type RuleFormServices } from './rule_form';
import { useFormDefaults } from './hooks/use_form_defaults';

export interface StandaloneRuleFormProps {
  /* Initial query for the rule */
  query: string;
  services: RuleFormServices;
  /* Called with form values when form is submitted.
   * Only used when includeSubmission is false. */
  onSubmit?: (values: FormValues) => void;
  /* Called after successful rule creation (only used when includeSubmission is true) */
  onSuccess?: () => void;
  onCancel?: () => void;
  /* Whether to include YAML editor toggle (default: false) */
  includeYaml?: boolean;
  /* ES|QL callbacks for YAML editor autocomplete (required if includeYaml is true) */
  esqlCallbacks?: ESQLCallbacks;
  /* Whether the form is in a loading/disabled state */
  isDisabled?: boolean;
  /* Whether to include submit/cancel buttons (default: false).
   * When true, the form handles the API call internally. */
  includeSubmission?: boolean;
  /* Custom label for the submit button */
  submitLabel?: React.ReactNode;
  /* Custom label for the cancel button */
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
  esqlCallbacks,
  isDisabled = false,
  includeSubmission = false,
  onSuccess,
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
        esqlCallbacks={esqlCallbacks}
        isDisabled={isDisabled}
        includeSubmission={includeSubmission}
        onSuccess={onSuccess}
        onCancel={onCancel}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
      />
    </FormProvider>
  );
};
