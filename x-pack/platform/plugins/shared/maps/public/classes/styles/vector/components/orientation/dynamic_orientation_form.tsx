/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldSelect } from '../field_select';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { OrientationDynamicOptions } from '../../../../../../common/descriptor_types';
import type { StyleField } from '../../style_fields_helper';
import type { DynamicOrientationProperty } from '../../properties/dynamic_orientation_property';

interface Props {
  fields: StyleField[];
  onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: OrientationDynamicOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: DynamicOrientationProperty;
}

export function DynamicOrientationForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }: { field: StyleField | null }) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      field: field ?? undefined,
    });
  };

  return (
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
  );
}
