/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldSelect } from '../field_select';
import { StyleField } from '../../style_fields_helper';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { LabelDynamicOptions } from '../../../../../../common/descriptor_types';
import { DynamicTextProperty } from '../../properties/dynamic_text_property';

interface Props {
  fields: StyleField[];
  onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: LabelDynamicOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: DynamicTextProperty;
}

export function DynamicLabelForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }: { field: StyleField | null }) => {
    if (!field) {
      return;
    }

    onDynamicStyleChange(styleProperty.getStyleName(), { ...styleOptions, field });
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
