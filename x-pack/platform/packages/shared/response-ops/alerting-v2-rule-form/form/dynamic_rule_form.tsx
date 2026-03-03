/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { FormValues } from './types';
import { RuleForm } from './rule_form';
import type { RuleFormServices } from './contexts';
import { useFormDefaults } from './hooks/use_form_defaults';

export interface DynamicRuleFormProps {
  /** The query that drives form values - changes will sync to form state */
  query: string;
  services: RuleFormServices;
  onSubmit: (values: FormValues) => void;
  onCancel?: () => void;
  /** Whether to include YAML editor toggle (default: false) */
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
 * Dynamic rule form that syncs with external prop changes.
 *
 * Use this component when the form needs to react to external state changes,
 * such as when embedded in Discover where the query can change.
 *
 * The time field is automatically derived from the query's available date fields
 * by the TimeFieldSelect component (preferring @timestamp if available).
 *
 * Uses react-hook-form's `values` prop to sync form state on each prop change,
 * with `resetOptions: { keepDirtyValues: true }` to preserve user input.
 */
export const DynamicRuleForm: React.FC<DynamicRuleFormProps> = ({
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
  // Get default form values derived from the query
  const formValues = useFormDefaults({ query });

  const methods = useForm<FormValues>({
    mode: 'onBlur',
    values: formValues, // Sync form state on each prop change
    resetOptions: {
      keepDirtyValues: true, // Do not reset user's input
    },
  });

  return (
    <FormProvider {...methods}>
      {/* Hidden field to validate the ES|QL query */}
      <Controller
        name="evaluation.query.base"
        control={methods.control}
        rules={{
          required: i18n.translate('xpack.alertingV2.ruleForm.queryRequiredError', {
            defaultMessage: 'ES|QL query is required.',
          }),
          validate: (value) => validateEsqlQuery(value) ?? true,
        }}
        render={() => <></>}
      />
      <RuleForm
        services={services}
        onSubmit={onSubmit}
        includeQueryEditor={false}
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
