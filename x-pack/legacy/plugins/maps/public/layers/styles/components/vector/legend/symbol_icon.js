/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { getMakiSymbolSvg, styleSvg, buildSrcUrl } from '../../../symbol_utils';

export class SymbolIcon extends Component {
  state = {
    imgDataUrl: undefined,
    prevSymbolId: undefined,
    prevFill: undefined,
    prevStroke: undefined,
    prevStrokeWidth: undefined,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadSymbol(
      this.props.symbolId,
      this.props.fill,
      this.props.stroke,
      this.props.strokeWidth
    );
  }

  componentDidUpdate() {
    this._loadSymbol(
      this.props.symbolId,
      this.props.fill,
      this.props.stroke,
      this.props.strokeWidth
    );
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadSymbol(nextSymbolId, nextFill, nextStroke, nextStrokeWidth) {
    if (
      nextSymbolId === this.state.prevSymbolId &&
      nextFill === this.state.prevFill &&
      nextStroke === this.state.prevStroke &&
      nextStrokeWidth === this.state.prevStrokeWidth
    ) {
      return;
    }

    let imgDataUrl;
    try {
      const svg = getMakiSymbolSvg(nextSymbolId);
      const styledSvg = await styleSvg(svg, nextFill, nextStroke, nextStrokeWidth);
      imgDataUrl = buildSrcUrl(styledSvg);
    } catch (error) {
      // ignore failures - component will just not display an icon
    }

    if (this._isMounted) {
      this.setState({
        imgDataUrl,
        prevSymbolId: nextSymbolId,
        prevFill: nextFill,
        prevStroke: nextStroke,
        prevStrokeWidth: nextStrokeWidth,
      });
    }
  }

  render() {
    if (!this.state.imgDataUrl) {
      return null;
    }

    return <img width="16px" src={this.state.imgDataUrl} alt={this.props.symbolId} />;
  }
}

SymbolIcon.propTypes = {
  symbolId: PropTypes.string.isRequired,
  fill: PropTypes.string.isRequired,
  stroke: PropTypes.string.isRequired,
  strokeWidth: PropTypes.string.isRequired,
};
