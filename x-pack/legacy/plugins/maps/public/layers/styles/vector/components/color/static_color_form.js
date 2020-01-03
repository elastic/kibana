/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiColorPicker, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export function StaticColorForm(props) {
  const onColorChange = color => {
    props.onStaticStyleChange(props.styleProperty.getStyleName(), { color });
  };

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>{props.staticDynamicSelect}</EuiFlexItem>
      <EuiFlexItem>
        <EuiColorPicker
          onChange={onColorChange}
          color={props.styleProperty.getOptions().color}
          swatches={props.swatches}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
