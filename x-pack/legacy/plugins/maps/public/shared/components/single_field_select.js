/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiComboBox,
} from '@elastic/eui';

// Creates grouped options by grouping fields by field type
export const getGroupedFieldOptions = (fields, filterField) => {
  if (!fields) {
    return undefined;
  }

  const fieldsByTypeMap = new Map();
  const groupedFieldOptions = [];

  fields
    .filter(filterField)
    .forEach(field => {
      if (fieldsByTypeMap.has(field.type)) {
        const fieldsList = fieldsByTypeMap.get(field.type);
        fieldsList.push(field.name);
        fieldsByTypeMap.set(field.type, fieldsList);
      } else {
        fieldsByTypeMap.set(field.type, [field.name]);
      }
    });

  fieldsByTypeMap.forEach((fieldsList, fieldType) => {
    groupedFieldOptions.push({
      label: fieldType,
      options: fieldsList.sort().map(fieldName => {
        return { value: fieldName, label: fieldName };
      })
    });
  });

  groupedFieldOptions.sort((a, b) => {
    if (a.label < b.label) return -1;
    if (a.label > b.label) return 1;
    return 0;
  });

  return groupedFieldOptions;
};

export function SingleFieldSelect({ fields,
  filterField,
  onChange,
  value,
  placeholder,
  ...rest
}) {
  const onSelection = (selectedOptions) => {
    onChange(_.get(selectedOptions, '0.value'));
  };

  return (
    <EuiComboBox
      placeholder={placeholder}
      singleSelection={true}
      options={getGroupedFieldOptions(fields, filterField)}
      selectedOptions={value ? [{ value: value, label: value }] : []}
      onChange={onSelection}
      isDisabled={!fields}
      {...rest}
    />
  );
}

SingleFieldSelect.propTypes = {
  placeholder: PropTypes.string,
  fields: PropTypes.oneOfType([
    PropTypes.object, // IndexedArray object
    PropTypes.array // array of Field objects
  ]),
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string, // fieldName
  filterField: PropTypes.func,
};

SingleFieldSelect.defaultProps = {
  filterField: () => { return true; }
};
