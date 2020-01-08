/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { ColorRampSelect } from './color_ramp_select';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

export function DynamicColorForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), { ...styleOptions, field });
  };

  const onColorChange = colorOptions => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      ...colorOptions,
    });
  };

  let colorRampSelect;
  if (styleOptions.field && styleOptions.field.name) {
    colorRampSelect = (
      <ColorRampSelect
        onChange={onColorChange}
        color={styleOptions.color}
        customColorRamp={styleOptions.customColorRamp}
        useCustomColorRamp={_.get(styleOptions, 'useCustomColorRamp', false)}
        compressed
      />
    );
  }

  return (
    <Fragment>
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
      <EuiSpacer size="s" />
      {colorRampSelect}
    </Fragment>
  );
}
