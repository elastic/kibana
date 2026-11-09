/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { ValidatedRange } from '../../../../../components/validated_range';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { OrientationStaticOptions } from '../../../../../../common/descriptor_types';
import type { StaticOrientationProperty } from '../../properties/static_orientation_property';

interface Props {
  onStaticStyleChange: (propertyName: VECTOR_STYLES, options: OrientationStaticOptions) => void;
  staticDynamicSelect?: ReactNode;
  styleProperty: StaticOrientationProperty;
}

export function StaticOrientationForm({
  onStaticStyleChange,
  staticDynamicSelect,
  styleProperty,
}: Props) {
  const onOrientationChange = (orientation: number) => {
    onStaticStyleChange(styleProperty.getStyleName(), { orientation });
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
        {staticDynamicSelect}
      </EuiFlexItem>
      <EuiFlexItem>
        <ValidatedRange
          min={0}
          max={360}
          value={styleProperty.getOptions().orientation}
          onChange={onOrientationChange}
          showInput="inputWithPopover"
          showLabels
          compressed
          append="°"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
