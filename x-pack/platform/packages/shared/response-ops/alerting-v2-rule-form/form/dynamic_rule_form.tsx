/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { FormValues } from './types';
import { RuleForm, type RuleFormServices } from './rule_form';
import { getGroupByColumnsFromQuery } from './hooks/use_default_group_by';

export interface DynamicRuleFormProps {
  /** Form ID for submission */
  formId: string;
  /** The query that drives form values - changes will sync to form state */
  query: string;
  /** Optional default time field */
  defaultTimeField?: string;
  /** Whether the query has validation errors from the parent (e.g., Discover) */
  isQueryInvalid?: boolean;
  /** Services required for form fields */
  services: RuleFormServices;
  /** Submit handler */
  onSubmit: (values: FormValues) => void;
}

/**
 * Dynamic rule form that syncs with external prop changes.
 *
 * Use this component when the form needs to react to external state changes,
 * such as when embedded in Discover where the query can change.
 *
 * Uses react-hook-form's `values` prop to sync form state on each prop change,
 * with `resetOptions: { keepDirtyValues: true }` to preserve user input.
 */
export const DynamicRuleForm: React.FC<DynamicRuleFormProps> = ({
  formId,
  query,
  defaultTimeField,
  isQueryInvalid,
  services,
  onSubmit,
}) => {
  // Compute derived values from props
  const groupingKey = useMemo(() => getGroupByColumnsFromQuery(query), [query]);

  // Form values that sync with props
  const formValues: FormValues = useMemo(
    () => ({
      kind: 'alert',
      name: '',
      description: '',
      tags: [],
      schedule: {
        custom: '5m',
      },
      lookbackWindow: '5m',
      timeField: defaultTimeField ?? '',
      enabled: true,
      query,
      groupingKey,
    }),
    [query, defaultTimeField, groupingKey]
  );

  const methods = useForm<FormValues>({
    mode: 'onBlur',
    values: formValues, // Sync form state on each prop change
    resetOptions: {
      keepDirtyValues: true, // Do not reset user's input
    },
  });

  const { setError, clearErrors } = methods;

  // Handle query validation errors from the parent
  useEffect(() => {
    if (isQueryInvalid) {
      setError('query', {
        type: 'manual',
        message: i18n.translate('xpack.alertingV2.ruleForm.invalidQueryError', {
          defaultMessage:
            'The query resulted in an error. Please review the query before saving the rule.',
        }),
      });
    } else {
      clearErrors('query');
    }
  }, [isQueryInvalid, setError, clearErrors]);

  return (
    <FormProvider {...methods}>
      <RuleForm formId={formId} services={services} onSubmit={onSubmit} />
    </FormProvider>
  );
};
