/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldSelect } from '../field_select';

export function DynamicLabelEditor(props) {
  const styleOptions = props.styleProperty.getOptions();

  const onFieldChange = ({ field }) => {
    props.onDynamicStyleChange(props.styleProperty.getStyleName(), { ...styleOptions, field });
  };

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>{props.staticDynamicSelect}</EuiFlexItem>
      <EuiFlexItem>
        <FieldSelect
          fields={props.fields}
          selectedFieldName={_.get(styleOptions, 'field.name')}
          onChange={onFieldChange}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
