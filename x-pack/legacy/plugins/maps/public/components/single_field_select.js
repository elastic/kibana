/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import { EuiComboBox, EuiHighlight } from '@elastic/eui';
import { FieldIcon } from '../../../../../../src/plugins/kibana_react/public';

function fieldsToOptions(fields) {
  if (!fields) {
    return [];
  }

  return fields
    .map(field => {
      return {
        value: field,
        label: 'label' in field ? field.label : field.name,
      };
    })
    .sort((a, b) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });
}

function renderOption(option, searchValue, contentClassName) {
  return (
    <span className={contentClassName}>
      <FieldIcon type={option.value.type} size="m" useColor />
      &nbsp;
      <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
    </span>
  );
}

export function SingleFieldSelect({ fields, onChange, value, placeholder, ...rest }) {
  const onSelection = selectedOptions => {
    onChange(_.get(selectedOptions, '0.value.name'));
  };

  return (
    <EuiComboBox
      placeholder={placeholder}
      singleSelection={true}
      options={fieldsToOptions(fields)}
      selectedOptions={value ? [{ value: value, label: value }] : []}
      onChange={onSelection}
      isDisabled={!fields}
      renderOption={renderOption}
      {...rest}
    />
  );
}

SingleFieldSelect.propTypes = {
  placeholder: PropTypes.string,
  fields: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string, // fieldName
};
