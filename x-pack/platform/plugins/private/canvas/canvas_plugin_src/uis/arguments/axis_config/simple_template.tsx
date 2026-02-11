/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
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

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  // @ts-expect-error upgrade typescript v5.9.3
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

SimpleTemplate.displayName = 'AxisConfigSimpleInput';
