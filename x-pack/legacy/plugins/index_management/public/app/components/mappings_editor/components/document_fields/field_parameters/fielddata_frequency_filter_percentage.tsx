/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiDualRange } from '@elastic/eui';

import { FieldHook } from '../../../shared_imports';

interface Props {
  min: FieldHook;
  max: FieldHook;
}

export const FielddataFrequencyFilterPercentage = ({ min, max }: Props) => {
  const onFrequencyFilterChange = ([minValue, maxValue]: any) => {
    min.setValue(minValue);
    max.setValue(maxValue);
  };

  return (
    <EuiDualRange
      min={0}
      max={100}
      value={[min.value as number, max.value as number]}
      onChange={onFrequencyFilterChange}
      showInput
      fullWidth
    />
  );
};
