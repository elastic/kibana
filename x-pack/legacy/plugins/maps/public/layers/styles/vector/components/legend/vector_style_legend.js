/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { rangeShape } from '../style_option_shapes';
import { StylePropertyLegendRow } from './style_property_legend_row';
import { LINE_STYLES, POLYGON_STYLES } from '../../vector_style_defaults';

export class VectorStyleLegend extends Component {

  state = {
    isLinesOnly: false,
    isPolygonsOnly: false,
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFeatureTypes();
  }

  componentDidUpdate() {
    this._loadFeatureTypes();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadFeatureTypes() {
    const isLinesOnly = await this.props.loadIsLinesOnly();
    const isPolygonsOnly = await this.props.loadIsPolygonsOnly();
    if (this._isMounted && (isLinesOnly !== this.state.isLinesOnly || isPolygonsOnly !== this.state.isPolygonsOnly)) {
      this.setState({ isLinesOnly, isPolygonsOnly });
    }
  }

  render() {
    const legendRows = this.props.styleProperties
      .filter(styleProperty => {
        const styleName = styleProperty.style.getStyleName();
        if (this.state.isLinesOnly) {
          return LINE_STYLES.includes(styleName);
        }

        if (this.state.isPolygonsOnly) {
          return POLYGON_STYLES.includes(styleName);
        }

        return true;
      })
      .map(styleProperty => {
        return (
          <StylePropertyLegendRow
            style={styleProperty.style}
            key={styleProperty.style.getStyleName()}
            range={styleProperty.range}
          />
        );
      });

    return <Fragment>{legendRows}</Fragment>;
  }
}

const stylePropertyShape = PropTypes.shape({
  range: rangeShape,
  style: PropTypes.object
});

VectorStyleLegend.propTypes = {
  loadIsLinesOnly: PropTypes.func.isRequired,
  loadIsPolygonsOnly: PropTypes.func.isRequired,
  styleProperties: PropTypes.arrayOf(stylePropertyShape).isRequired,
};
