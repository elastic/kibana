/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { CircleIcon } from './circle_icon';
import { LineIcon } from './line_icon';
import { PolygonIcon } from './polygon_icon';
import { SymbolIcon } from './symbol_icon';
import { VECTOR_STYLES } from '../../vector_style_defaults';

export class VectorIcon extends Component {
  state = {
    isInitialized: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._init();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _init() {
    const isPointsOnly = await this.props.loadIsPointsOnly();
    const isLinesOnly = await this.props.loadIsLinesOnly();
    if (this._isMounted) {
      this.setState({
        isInitialized: true,
        isPointsOnly,
        isLinesOnly,
      });
    }
  }

  render() {
    if (!this.state.isInitialized) {
      return null;
    }

    if (this.state.isLinesOnly) {
      const style = {
        stroke: this.props.getColorForProperty(VECTOR_STYLES.LINE_COLOR, true),
        strokeWidth: '4px',
      };
      return <LineIcon style={style} />;
    }

    const style = {
      stroke: this.props.getColorForProperty(VECTOR_STYLES.LINE_COLOR, false),
      strokeWidth: '1px',
      fill: this.props.getColorForProperty(VECTOR_STYLES.FILL_COLOR, false),
    };

    if (!this.state.isPointsOnly) {
      return <PolygonIcon style={style} />;
    }

    if (!this.props.symbolId) {
      return <CircleIcon style={style} />;
    }

    return (
      <SymbolIcon
        symbolId={this.props.symbolId}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
    );
  }
}

VectorIcon.propTypes = {
  getColorForProperty: PropTypes.func.isRequired,
  symbolId: PropTypes.string,
  loadIsPointsOnly: PropTypes.func.isRequired,
  loadIsLinesOnly: PropTypes.func.isRequired,
};
