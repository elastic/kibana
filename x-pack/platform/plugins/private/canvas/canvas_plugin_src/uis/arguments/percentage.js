/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { EuiRange } from '@elastic/eui';
import { withDebounceArg } from '../../../public/components/with_debounce_arg';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { Percentage: strings } = ArgumentStrings;

const PercentageArgInput = ({ onValueChange, argValue }) => {
  const [value, setValue] = useState(argValue);

  const handleChange = useCallback(
    (ev) => {
      const { value } = ev.target;
      const numberVal = Number(value) / 100;
      setValue(numberVal);
      onValueChange(numberVal);
    },
    [onValueChange]
  );

  return (
    <EuiRange
      compressed
      min={0}
      max={100}
      showLabels
      showInput
      value={value * 100}
      onChange={handleChange}
    />
  );
};

PercentageArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
  argId: PropTypes.string.isRequired,
};

export const percentage = () => ({
  name: 'percentage',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(withDebounceArg(PercentageArgInput, 50)),
});
