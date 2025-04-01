/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldSelect } from '../field_select';
import { SizeRangeSelector } from './size_range_selector';
import { SizeDynamicOptions } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { DynamicSizeProperty } from '../../properties/dynamic_size_property';
import { StyleField } from '../../style_fields_helper';

interface Props {
  fields: StyleField[];
  onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: SizeDynamicOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: DynamicSizeProperty;
}

export function DynamicSizeForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }: { field: StyleField | null }) => {
    if (field) {
      onDynamicStyleChange(styleProperty.getStyleName(), {
        ...styleOptions,
        field: { name: field.name, origin: field.origin },
      });
    }
  };

  const onSizeRangeChange = ({ minSize, maxSize }: { minSize: number; maxSize: number }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      minSize,
      maxSize,
    });
  };

  const onInvertChange = (event: EuiSwitchEvent) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      invert: event.target.checked,
    });
  };

  let sizeRange;
  if (styleOptions.field && styleOptions.field.name) {
    sizeRange = (
      <>
        <SizeRangeSelector
          onChange={onSizeRangeChange}
          minSize={styleOptions.minSize}
          maxSize={styleOptions.maxSize}
          showLabels
          compressed
        />
        <EuiFormRow display="columnCompressed">
          <EuiSwitch
            label={i18n.translate('xpack.maps.style.revereseSizeLabel', {
              defaultMessage: `Reverse size`,
            })}
            checked={!!styleOptions.invert}
            onChange={onInvertChange}
            compressed
          />
        </EuiFormRow>
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
          {staticDynamicSelect}
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            styleName={styleProperty.getStyleName()}
            fields={fields}
            selectedFieldName={styleProperty.getFieldName()}
            onChange={onFieldChange}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {sizeRange}
    </>
  );
}
