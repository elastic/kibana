/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFieldNumber, EuiFieldNumberProps } from '@elastic/eui';

export const NumberField: React.FC<
  EuiFieldNumberProps & {
    onChange: (value: string) => void;
  }
> = (props) => {
  const [displayValue, setDisplayValue] = useState(props.value);
  const min = typeof props.min !== 'undefined' ? props.min : -Infinity;
  const max = typeof props.max !== 'undefined' ? props.max : Infinity;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      const valueAsNumber = Number(value);

      const isValid = !isNaN(valueAsNumber) && valueAsNumber >= min && valueAsNumber <= max;

      if (isValid || value === '') {
        setDisplayValue(value);
      }
      if (isValid && props.onChange) {
        props.onChange(value);
      }
    },
    [props, setDisplayValue, max, min]
  );

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNaN(Number(displayValue)) || displayValue === '') {
        setDisplayValue(props.value);
      }
      if (props.onBlur) props.onBlur(e);
    },
    [displayValue, props, setDisplayValue]
  );

  return <EuiFieldNumber {...props} value={displayValue} onChange={onChange} onBlur={onBlur} />;
};
