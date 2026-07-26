/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiSwitch } from '@elastic/eui';

export interface Props {
  onValueChange: (argValue: boolean) => void;
  argValue: boolean;
}

export const SimpleTemplate: FunctionComponent<Props> = ({ onValueChange, argValue }) => {
  return (
    <EuiSwitch
      compressed
      checked={Boolean(argValue)}
      onChange={() => onValueChange(!Boolean(argValue))}
      showLabel={false}
      label=""
    />
  );
};

SimpleTemplate.displayName = 'AxisConfigSimpleInput';
