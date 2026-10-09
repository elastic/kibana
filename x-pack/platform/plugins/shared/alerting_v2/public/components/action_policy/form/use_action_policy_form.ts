/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from './constants';
import { toFormState } from './form_utils';
import type { ActionPolicyFormState } from './types';

interface UseActionPolicyFormParams {
  initialValues?: ActionPolicyResponse;
  onSubmitCreate: (values: ActionPolicyFormState) => void;
  onSubmitUpdate: (id: string, values: ActionPolicyFormState) => void;
}

/**
 * Validation lives in the field rules of the form components, so `handleSubmit`
 * only calls the submit callbacks once every mounted field is valid.
 */
export const useActionPolicyForm = ({
  initialValues,
  onSubmitCreate,
  onSubmitUpdate,
}: UseActionPolicyFormParams) => {
  const isEditMode = !!initialValues;

  const defaultValues = useMemo(
    () => (initialValues ? toFormState(initialValues) : DEFAULT_FORM_STATE),
    [initialValues]
  );

  const methods = useForm<ActionPolicyFormState>({
    mode: 'onBlur',
    defaultValues,
  });

  const onSubmitValid = useCallback(
    (values: ActionPolicyFormState) => {
      if (initialValues) {
        onSubmitUpdate(initialValues.id, values);
      } else {
        onSubmitCreate(values);
      }
    },
    [initialValues, onSubmitCreate, onSubmitUpdate]
  );

  const handleSubmit = useMemo(() => methods.handleSubmit(onSubmitValid), [methods, onSubmitValid]);

  return {
    methods,
    isEditMode,
    handleSubmit,
  };
};
