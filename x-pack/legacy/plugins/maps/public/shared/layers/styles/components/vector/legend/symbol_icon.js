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
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadSymbol(this.props.symbolId, this.props.fill);
  }

  componentDidUpdate() {
    this._loadSymbol(this.props.symbolId, this.props.fill);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadSymbol(nextSymbolId, nextFill) {
    if (nextSymbolId === this.state.prevSymbolId
      && nextFill === this.state.prevFill) {
      return;
    }

    let imgDataUrl;
    try {
      const svg = getMakiSymbolSvg(nextSymbolId);
      const styledSvg = await styleSvg(svg, nextFill);
      imgDataUrl = buildSrcUrl(styledSvg);
    } catch (error) {
      // ignore failures - component will just not display an icon
    }

    if (this._isMounted) {
      this.setState({
        imgDataUrl,
        prevSymbolId: nextSymbolId,
        prevFill: nextFill
      });
    }
  }

  render() {
    if (!this.state.imgDataUrl) {
      return null;
    }

    return (
      <img width="16px" src={this.state.imgDataUrl} alt={this.props.symbolId} />
    );
  }
}

SymbolIcon.propTypes = {
  symbolId: PropTypes.string.isRequired,
  fill: PropTypes.string.isRequired,
};
