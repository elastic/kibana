/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { SizeRangeSelector } from './size_range_selector';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { OrdinalFieldMetaOptionsPopover } from '../ordinal_field_meta_options_popover';

export function DynamicSizeForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), { ...styleOptions, field });
  };

  const onFieldMetaOptionsChange = fieldMetaOptions => {
    const options = {
      ...styleProperty.getOptions(),
      fieldMetaOptions,
    };
    onDynamicStyleChange(styleProperty.getStyleName(), options);
  };

  const onSizeRangeChange = ({ minSize, maxSize }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      minSize,
      maxSize,
    });
  };

  let sizeRange;
  if (styleOptions.field && styleOptions.field.name) {
    sizeRange = (
      <SizeRangeSelector
        onChange={onSizeRangeChange}
        minSize={styleOptions.minSize}
        maxSize={styleOptions.maxSize}
        showLabels
        compressed
      />
    );
  }

  const fieldMetaOptionsPopover = styleProperty.supportsFieldMeta() ? (
    <OrdinalFieldMetaOptionsPopover
      styleProperty={styleProperty}
      onChange={onFieldMetaOptionsChange}
    />
  ) : null;

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
      {sizeRange}
      {fieldMetaOptionsPopover}
    </Fragment>
  );
}
