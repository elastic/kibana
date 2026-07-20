/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { isActionValid } from '@kbn/alerting-v2-rule-form';
import { useCallback, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { THROTTLE_INTERVAL_PATTERN } from './constants';
import { DEFAULT_FORM_STATE } from './constants';
import { needsInterval, toFormState } from './form_utils';
import type { ActionPolicyFormState } from './types';

interface UseActionPolicyFormParams {
  initialValues?: ActionPolicyResponse;
  onSubmitCreate: (values: ActionPolicyFormState) => void;
  onSubmitUpdate: (id: string, values: ActionPolicyFormState, version: string) => void;
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

  const [
    name,
    destinations,
    groupingMode,
    groupBy,
    throttleStrategy,
    throttleInterval,
    inlineActions,
  ] = useWatch({
    control: methods.control,
    name: [
      'name',
      'destinations',
      'groupingMode',
      'groupBy',
      'throttleStrategy',
      'throttleInterval',
      'inlineActions',
    ],
  });

  const isSubmitEnabled = useMemo(() => {
    const hasName = name.trim().length > 0;
    const hasDestinations = destinations.length > 0 || inlineActions.length > 0;
    const allInlineActionsValid = inlineActions.every(isActionValid);
    const hasValidGroupBy = groupingMode === 'per_field' ? groupBy.length > 0 : true;
    const hasValidInterval =
      !needsInterval(throttleStrategy) || THROTTLE_INTERVAL_PATTERN.test(throttleInterval);

    return (
      hasName && hasDestinations && allInlineActionsValid && hasValidGroupBy && hasValidInterval
    );
  }, [
    destinations.length,
    groupBy.length,
    groupingMode,
    inlineActions,
    name,
    throttleStrategy,
    throttleInterval,
  ]);

  const onSubmitValid = useCallback(
    (values: ActionPolicyFormState) => {
      if (isEditMode && initialValues?.version) {
        onSubmitUpdate(initialValues.id, values, initialValues.version);
      } else {
        onSubmitCreate(values);
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
