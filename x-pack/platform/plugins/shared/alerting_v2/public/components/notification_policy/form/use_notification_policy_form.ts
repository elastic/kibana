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
import { useForm, useWatch } from 'react-hook-form';
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

  const [name, destinations, frequency, dispatchPer, groupBy] = useWatch({
    control: methods.control,
    name: ['name', 'destinations', 'frequency', 'dispatchPer', 'groupBy'],
  });

  const isSubmitEnabled = useMemo(() => {
    const hasName = name.trim().length > 0;
    const hasDestinations = destinations.length > 0;

    let frequencyValid = true;
    if (frequency.type === 'group_throttle' || frequency.type === 'episode_status_change_repeat') {
      const { repeatValue } = frequency;
      frequencyValid =
        typeof repeatValue === 'number' && !Number.isNaN(repeatValue) && repeatValue >= 1;
    }

    const groupByValid = dispatchPer !== 'group' || groupBy.length > 0;

    return hasName && hasDestinations && frequencyValid && groupByValid;
  }, [destinations.length, dispatchPer, frequency, groupBy.length, name]);

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
    isSubmitEnabled,
    handleSubmit,
  };
};
