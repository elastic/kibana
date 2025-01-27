/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { LabelStaticOptions } from '../../../../../../common/descriptor_types';
import { StaticTextProperty } from '../../properties/static_text_property';

interface Props {
  onStaticStyleChange: (propertyName: VECTOR_STYLES, options: LabelStaticOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: StaticTextProperty;
}

export function StaticLabelForm({
  onStaticStyleChange,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    onStaticStyleChange(styleProperty.getStyleName(), { value: event.target.value });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldText
          placeholder={i18n.translate('xpack.maps.styles.staticLabel.valuePlaceholder', {
            defaultMessage: 'symbol label',
          })}
          value={styleProperty.getOptions().value}
          onChange={onValueChange}
          aria-label={i18n.translate('xpack.maps.styles.staticLabel.valueAriaLabel', {
            defaultMessage: 'symbol label',
          })}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
