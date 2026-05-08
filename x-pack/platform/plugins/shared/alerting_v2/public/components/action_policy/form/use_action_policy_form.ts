/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateActionPolicyData,
  ActionPolicyResponse,
  UpdateActionPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { useCallback, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { THROTTLE_INTERVAL_PATTERN } from './constants';
import { DEFAULT_FORM_STATE } from './constants';
import { needsInterval, toCreatePayload, toFormState, toUpdatePayload } from './form_utils';
import type { ActionPolicyFormState } from './types';

interface UseActionPolicyFormParams {
  initialValues?: ActionPolicyResponse;
  onSubmitCreate: (data: CreateActionPolicyData) => void;
  onSubmitUpdate: (id: string, data: UpdateActionPolicyBody) => void;
}

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

  const [name, destinations, groupingMode, groupBy, throttleStrategy, throttleInterval] = useWatch({
    control: methods.control,
    name: [
      'name',
      'destinations',
      'groupingMode',
      'groupBy',
      'throttleStrategy',
      'throttleInterval',
    ],
  });

  const isSubmitEnabled = useMemo(() => {
    const hasName = name.trim().length > 0;
    const hasDestinations = destinations.length > 0;
    const hasValidGroupBy = groupingMode === 'per_field' ? groupBy.length > 0 : true;
    const hasValidInterval =
      !needsInterval(throttleStrategy) || THROTTLE_INTERVAL_PATTERN.test(throttleInterval);

    return hasName && hasDestinations && hasValidGroupBy && hasValidInterval;
  }, [destinations.length, groupBy.length, groupingMode, name, throttleStrategy, throttleInterval]);

  const onSubmitValid = useCallback(
    (values: ActionPolicyFormState) => {
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
