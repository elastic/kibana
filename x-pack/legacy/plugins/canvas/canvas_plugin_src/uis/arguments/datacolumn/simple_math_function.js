/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';

export const SimpleMathFunction = ({ onChange, value, inputRef, onlymath }) => {
  const options = [
    { text: 'Average', value: 'mean' },
    { text: 'Count', value: 'size' },
    { text: 'First', value: 'first' },
    { text: 'Last', value: 'last' },
    { text: 'Max', value: 'max' },
    { text: 'Median', value: 'median' },
    { text: 'Min', value: 'min' },
    { text: 'Sum', value: 'sum' },
    { text: 'Unique', value: 'unique' },
  ];

  if (!onlymath) {
    options.unshift({ text: 'Value', value: '' });
  }

  return (
    <EuiSelect compressed options={options} inputRef={inputRef} value={value} onChange={onChange} />
  );
};

SimpleMathFunction.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  inputRef: PropTypes.func,
  onlymath: PropTypes.bool,
};

SimpleMathFunction.defaultProps = {
  value: '',
};
