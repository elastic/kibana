/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { EuiSelect } from '@elastic/eui';
import { ArgumentStrings } from '../../../../i18n';

const { DataColumn: strings } = ArgumentStrings;

export const SimpleMathFunction = ({ onChange, value, onlymath }) => {
  const options = [
    { text: strings.getOptionAverage(), value: 'mean' },
    { text: strings.getOptionCount(), value: 'size' },
    { text: strings.getOptionFirst(), value: 'first' },
    { text: strings.getOptionLast(), value: 'last' },
    { text: strings.getOptionMax(), value: 'max' },
    { text: strings.getOptionMedian(), value: 'median' },
    { text: strings.getOptionMin(), value: 'min' },
    { text: strings.getOptionSum(), value: 'sum' },
    { text: strings.getOptionUnique(), value: 'unique' },
  ];

  if (!onlymath) {
    options.unshift({ text: strings.getOptionValue(), value: '' });
  }

  return (
    <EuiSelect
      compressed
      options={options}
      value={value}
      onChange={onChange}
      aria-label={i18n.translate('xpack.canvas.simpleMathFunction.functionSelectAriaLabel', {
        defaultMessage: 'Math function',
      })}
    />
  );
};

SimpleMathFunction.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  onlymath: PropTypes.bool,
};

SimpleMathFunction.defaultProps = {
  value: '',
};
