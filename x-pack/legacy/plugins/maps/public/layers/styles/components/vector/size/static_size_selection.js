/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { staticSizeShape } from '../style_option_shapes';
import { ValidatedRange } from '../../../../../components/validated_range';
import { i18n } from '@kbn/i18n';

export function StaticSizeSelection({ onChange, styleOptions }) {
  const onSizeChange = size => {
    onChange({ size });
  };

  return (
    <ValidatedRange
      min={0}
      max={100}
      value={styleOptions.size}
      onChange={onSizeChange}
      showInput
      showLabels
      compressed
      append={i18n.translate('xpack.maps.vector.size.unitLabel', {
        defaultMessage: 'px',
        description: 'Shorthand for pixel',
      })}
    />
  );
}

StaticSizeSelection.propTypes = {
  styleOptions: staticSizeShape.isRequired,
  onChange: PropTypes.func.isRequired,
};
