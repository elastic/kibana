/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ValidatedRange } from '../../../../../components/validated_range';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export function StaticSizeForm(props) {
  const onSizeChange = size => {
    props.onStaticStyleChange(props.styleProperty.getStyleName(), { size });
  };

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>{props.staticDynamicSelect}</EuiFlexItem>
      <EuiFlexItem>
        <ValidatedRange
          min={0}
          max={100}
          value={props.styleProperty.getOptions().size}
          onChange={onSizeChange}
          showInput="inputWithPopover"
          showLabels
          compressed
          append={i18n.translate('xpack.maps.vector.size.unitLabel', {
            defaultMessage: 'px',
            description: 'Shorthand for pixel',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
