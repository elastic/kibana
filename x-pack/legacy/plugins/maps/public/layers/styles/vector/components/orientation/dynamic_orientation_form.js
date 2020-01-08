/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { FieldSelect } from '../field_select';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export function DynamicOrientationForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      field,
    });
  };

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>{staticDynamicSelect}</EuiFlexItem>
      <EuiFlexItem>
        <FieldSelect
          fields={fields}
          selectedFieldName={_.get(styleOptions, 'field.name')}
          onChange={onFieldChange}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
