/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { MAX_CONSECUTIVE_BREACHES } from '@kbn/alerting-v2-schemas';
import { POSITIVE_INTEGER_REGEX } from '../utils';

const DEFAULT_PENDING_COUNT = 2;

export interface StateTransitionCountInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  error?: { message?: string };
  inputRef: React.Ref<HTMLInputElement>;
  prependLabel?: string;
}

export const StateTransitionCountInput: React.FC<StateTransitionCountInputProps> = ({
  value,
  onChange,
  onKeyDown,
  error,
  inputRef,
  prependLabel,
}) => {
  const formValue = value ?? DEFAULT_PENDING_COUNT;
  const [localCount, setLocalCount] = useState<string>(String(formValue));

  useEffect(() => {
    setLocalCount(String(formValue));
  }, [formValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.trim();
      setLocalCount(val);
      if (POSITIVE_INTEGER_REGEX.test(val)) {
        const parsedValue = parseInt(val, 10);
        if (parsedValue <= MAX_CONSECUTIVE_BREACHES) {
          onChange(parsedValue);
        }
      }
    },
    [onChange]
  );

  const onBlur = useCallback(() => {
    if (!POSITIVE_INTEGER_REGEX.test(localCount)) {
      setLocalCount(String(formValue));
    }
  }, [localCount, formValue]);

  return (
    <EuiFieldNumber
      value={localCount}
      onChange={handleChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      min={1}
      max={MAX_CONSECUTIVE_BREACHES}
      step={1}
      isInvalid={!!error}
      data-test-subj="stateTransitionCountInput"
      inputRef={inputRef}
      fullWidth
      prepend={prependLabel ? [prependLabel] : undefined}
    />
  );
};
