/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiComboBox } from '@elastic/eui';
import { get } from 'lodash';

const defaultIndex = '_all';

export const ESIndexSelect = ({ value, loading, indices, onChange, onFocus, onBlur }) => {
  const selectedOption = value !== defaultIndex ? [{ label: value }] : [];
  const options = indices.map(index => ({ label: index }));

  return (
    <EuiComboBox
      selectedOptions={selectedOption}
      onChange={([index]) => onChange(get(index, 'label', defaultIndex))}
      onSearchChange={searchValue => {
        // resets input when user starts typing
        if (searchValue) {
          onChange(defaultIndex);
        }
      }}
      onBlur={onBlur}
      onFocus={onFocus}
      disabled={loading}
      options={options}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      onCreateOption={input => onChange(input || defaultIndex)}
      compressed
    />
  );
};

ESIndexSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  indices: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
};

ESIndexSelect.defaultProps = {
  value: defaultIndex,
};
