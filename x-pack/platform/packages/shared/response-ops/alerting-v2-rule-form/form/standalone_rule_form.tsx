/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import type { FormValues } from './types';
import { RuleForm, type RuleFormServices } from './rule_form';
import { useFormDefaults } from './hooks/use_form_defaults';

export interface StandaloneRuleFormProps {
  /** Form ID for submission */
  formId: string;
  /** Initial query for the rule */
  query: string;
  /** Services required for form fields */
  services: RuleFormServices;
  /** Submit handler */
  onSubmit: (values: FormValues) => void;
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
  formId,
  query,
  services,
  onSubmit,
}) => {
  const defaultValues = useFormDefaults({ query });

  const methods = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <RuleForm formId={formId} services={services} onSubmit={onSubmit} />
    </FormProvider>
  );
};
