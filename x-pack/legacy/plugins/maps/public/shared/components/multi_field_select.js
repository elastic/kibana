/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiComboBox,
} from '@elastic/eui';

import { getGroupedFieldOptions } from './single_field_select';

// TODO create better component that allows for changing field order

export function MultiFieldSelect({
  fields,
  filterField,
  onChange,
  value,
  placeholder,
  ...rest
}) {

  if (!fields) {
    return null;
  }

  const onSelection = (selectedOptions) => {
    const fieldNamesArray = selectedOptions.map(({ value }) => {
      return value;
    });
    onChange(fieldNamesArray);
  };

  let selectedOptions;
  if (value) {
    selectedOptions = value.map(fieldName => {
      const matchingField = fields.find(field => {
        return field.name === fieldName;
      });
      const labelValue = matchingField && matchingField.label ? matchingField.label : fieldName;
      return { value: fieldName, label: labelValue };
    });
  } else {
    selectedOptions = [];
  }

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={getGroupedFieldOptions(fields, filterField)}
      selectedOptions={selectedOptions}
      onChange={onSelection}
      {...rest}
    />
  );
}

MultiFieldSelect.propTypes = {
  placeholder: PropTypes.string,
  fields: PropTypes.array, // array of Field objects
  onChange: PropTypes.func.isRequired,
  value: PropTypes.arrayOf(PropTypes.string), // array of fieldNames
  filterField: PropTypes.func,
};

MultiFieldSelect.defaultProps = {
  filterField: () => { return true; }
};
