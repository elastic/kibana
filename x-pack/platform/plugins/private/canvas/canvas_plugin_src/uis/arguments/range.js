/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { EuiRange } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { withDebounceArg } from '../../../public/components/with_debounce_arg';
import { ArgumentStrings } from '../../../i18n';

const { Range: strings } = ArgumentStrings;

const RangeArgInput = ({ typeInstance, onValueChange, argValue }) => {
  const { min, max, step } = typeInstance.options;
  const [value, setValue] = useState(argValue);

  const handleChange = useCallback(
    (ev) => {
      const { value } = ev.target;
      const numberVal = Number(value);
      setValue(numberVal);
      onValueChange(numberVal);
    },
    [onValueChange]
  );

  return (
    <EuiRange
      compressed
      min={min}
      max={max}
      step={step}
      showLabels
      showInput
      value={value}
      onChange={handleChange}
    />
  );
};

RangeArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  typeInstance: PropTypes.shape({
    options: PropTypes.shape({
      min: PropTypes.number.isRequired,
      max: PropTypes.number.isRequired,
      step: PropTypes.number,
    }).isRequired,
  }),
  argId: PropTypes.string.isRequired,
};

export const range = () => ({
  name: 'range',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(withDebounceArg(RangeArgInput, 50)),
});
