/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { rangeShape } from '../style_option_shapes';
import { StylePropertyLegendRow } from './style_property_legend_row';

export function VectorStyleLegend({  styleProperties }) {
  return styleProperties.map(styleProperty => {
    return (
      <StylePropertyLegendRow
        style={styleProperty.style}
        key={styleProperty.style.getStyleName()}
        range={styleProperty.range}
      />
    );
  });
}

const stylePropertyShape = PropTypes.shape({
  range: rangeShape,
  style: PropTypes.object
});

VectorStyleLegend.propTypes = {
  styleProperties: PropTypes.arrayOf(stylePropertyShape).isRequired
};
