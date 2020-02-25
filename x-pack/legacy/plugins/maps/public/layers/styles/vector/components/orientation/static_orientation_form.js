/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ValidatedRange } from '../../../../../components/validated_range';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export function StaticOrientationForm({ onStaticStyleChange, staticDynamicSelect, styleProperty }) {
  const onOrientationChange = orientation => {
    onStaticStyleChange(styleProperty.getStyleName(), { orientation });
  };

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>{staticDynamicSelect}</EuiFlexItem>
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
