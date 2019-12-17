/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ValidatedDualRange } from 'ui/validated_range';
import { MIN_SIZE, MAX_SIZE } from '../../vector_style_defaults';
import { i18n } from '@kbn/i18n';

export function SizeRangeSelector({ minSize, maxSize, onChange, ...rest }) {
  const onSizeChange = ([min, max]) => {
    onChange({
      minSize: Math.max(MIN_SIZE, parseInt(min, 10)),
      maxSize: Math.min(MAX_SIZE, parseInt(max, 10)),
    });
  };

  return (
    <ValidatedDualRange
      min={MIN_SIZE}
      max={MAX_SIZE}
      step={1}
      value={[minSize, maxSize]}
      showInput="inputWithPopover"
      showRange
      onChange={onSizeChange}
      allowEmptyRange={false}
      append={i18n.translate('xpack.maps.vector.dualSize.unitLabel', {
        defaultMessage: 'px',
        description: 'Shorthand for pixel',
      })}
      {...rest}
    />
  );
}

SizeRangeSelector.propTypes = {
  minSize: PropTypes.number.isRequired,
  maxSize: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
