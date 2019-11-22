/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSwitch } from '@elastic/eui';

export interface Props {
  onValueChange: (argValue: boolean) => void;
  argValue: boolean;
}

export const SimpleTemplate = ({ onValueChange, argValue }: Props) => {
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
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

SimpleTemplate.displayName = 'AxisConfigSimpleInput';
