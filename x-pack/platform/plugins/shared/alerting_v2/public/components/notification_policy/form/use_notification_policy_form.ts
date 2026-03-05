/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateNotificationPolicyData,
  NotificationPolicyResponse,
  UpdateNotificationPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from './constants';
import { toCreatePayload, toFormState, toUpdatePayload } from './form_utils';
import type { NotificationPolicyFormState } from './types';

interface UseNotificationPolicyFormParams {
  initialValues?: NotificationPolicyResponse;
  onSubmitCreate: (data: CreateNotificationPolicyData) => void;
  onSubmitUpdate: (id: string, data: UpdateNotificationPolicyBody) => void;
}

export const useNotificationPolicyForm = ({
  initialValues,
  onSubmitCreate,
  onSubmitUpdate,
}: UseNotificationPolicyFormParams) => {
  const isEditMode = !!initialValues;

  const defaultValues = useMemo(
    () => (initialValues ? toFormState(initialValues) : DEFAULT_FORM_STATE),
    [initialValues]
  );

  const methods = useForm<NotificationPolicyFormState>({
    mode: 'onBlur',
    defaultValues,
  });

  const onSubmitValid = useCallback(
    (values: NotificationPolicyFormState) => {
      if (isEditMode && initialValues?.version) {
        onSubmitUpdate(initialValues.id, toUpdatePayload(values, initialValues.version));
      } else {
        onSubmitCreate(toCreatePayload(values));
      }
    },
    [isEditMode, initialValues, onSubmitCreate, onSubmitUpdate]
  );

  const handleSubmit = useMemo(() => methods.handleSubmit(onSubmitValid), [methods, onSubmitValid]);

  return {
    methods,
    isEditMode,
    handleSubmit,
  };
};
