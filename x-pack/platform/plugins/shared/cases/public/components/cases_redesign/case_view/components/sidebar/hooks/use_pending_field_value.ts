/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

const NO_PENDING_VALUE = Symbol('no-pending-value');

export interface UsePendingFieldValueArgs<T> {
  committedValue: T;
  onSubmit: (value: T) => void;
  validate?: (value: T) => string | null;
}

export interface UsePendingFieldValueResult<T> {
  currentValue: T;
  hasPendingChange: boolean;
  validationError: string | null;
  setPendingValue: (value: T) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Drives the "pending value + confirm/cancel" interaction shared by the redesigned sidebar's
 * inline-editable fields: a local override of `committedValue` that only takes effect once
 * confirmed, and reverts to the committed value on cancel. Uses a dedicated sentinel (rather
 * than `null`/`undefined`) to mean "no pending change", so it works for any `T` including
 * ones whose valid values include `null`/`undefined` (e.g. a clearable category).
 */
export const usePendingFieldValue = <T>({
  committedValue,
  onSubmit,
  validate,
}: UsePendingFieldValueArgs<T>): UsePendingFieldValueResult<T> => {
  const [pendingValue, setPendingValueState] = useState<T | typeof NO_PENDING_VALUE>(
    NO_PENDING_VALUE
  );

  const hasPendingValue = pendingValue !== NO_PENDING_VALUE;
  const currentValue = hasPendingValue ? pendingValue : committedValue;

  const hasPendingChange = useMemo(
    () => hasPendingValue && pendingValue !== committedValue,
    [hasPendingValue, pendingValue, committedValue]
  );

  const validationError = useMemo(() => {
    if (!hasPendingValue || !validate) {
      return null;
    }
    return validate(pendingValue);
  }, [hasPendingValue, pendingValue, validate]);

  const setPendingValue = useCallback((value: T) => {
    setPendingValueState(value);
  }, []);

  const onConfirm = useCallback(() => {
    if (!hasPendingValue || validationError != null) {
      return;
    }
    onSubmit(pendingValue);
    setPendingValueState(NO_PENDING_VALUE);
  }, [hasPendingValue, pendingValue, validationError, onSubmit]);

  const onCancel = useCallback(() => {
    setPendingValueState(NO_PENDING_VALUE);
  }, []);

  return { currentValue, hasPendingChange, validationError, setPendingValue, onConfirm, onCancel };
};
