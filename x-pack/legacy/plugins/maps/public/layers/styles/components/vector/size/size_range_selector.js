/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';
import { ValidatedDualRange } from 'ui/validated_range';
import { DEFAULT_MIN_SIZE, DEFAULT_MAX_SIZE } from '../../../vector_style_defaults';


export function SizeRangeSelector({ minSize, maxSize, onChange }) {

  const onSizeChange = ([min, max]) => {
    onChange({
      minSize: Math.max(DEFAULT_MIN_SIZE, parseInt(min, 10)),
      maxSize: Math.min(DEFAULT_MAX_SIZE, parseInt(max, 10))
    });
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow
          compressed
        >
          <ValidatedDualRange
            min={DEFAULT_MIN_SIZE}
            max={DEFAULT_MAX_SIZE}
            step={1}
            value={[minSize, maxSize]}
            showInput
            showRange
            onChange={onSizeChange}
            allowEmptyRange={false}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

SizeRangeSelector.propTypes = {
  minSize: PropTypes.number.isRequired,
  maxSize: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
