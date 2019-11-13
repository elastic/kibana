/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { staticOrientationShape } from '../style_option_shapes';
import { ValidatedRange } from '../../../../../components/validated_range';

export function StaticOrientationSelection({ onChange, styleOptions }) {
  const onOrientationChange = orientation => {
    onChange({ orientation });
  };

  return (
    <ValidatedRange
      min={0}
      max={360}
      value={styleOptions.orientation}
      onChange={onOrientationChange}
      showInput
      showLabels
      compressed
      append="°"
    />
  );
}

StaticOrientationSelection.propTypes = {
  styleOptions: staticOrientationShape.isRequired,
  onChange: PropTypes.func.isRequired,
};
