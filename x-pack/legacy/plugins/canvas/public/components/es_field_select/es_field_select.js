/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiComboBox } from '@elastic/eui';
import { get } from 'lodash';

export const ESFieldSelect = ({ value, fields = [], onChange, onFocus, onBlur }) => {
  const selectedOption = value ? [{ label: value }] : [];
  const options = fields.map(field => ({ label: field }));

  return (
    <EuiComboBox
      selectedOptions={selectedOption}
      options={options}
      onChange={([field]) => onChange(get(field, 'label', null))}
      onSearchChange={searchValue => {
        // resets input when user starts typing
        if (searchValue) {
          onChange(null);
        }
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      compressed
    />
  );
};

ESFieldSelect.propTypes = {
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  value: PropTypes.string,
  fields: PropTypes.array,
};

ESFieldSelect.defaultProps = {
  fields: [],
};
