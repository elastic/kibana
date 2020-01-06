/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
const EMPTY_VALUE = '';

export class CategoricalLegend extends React.Component {
  constructor() {
    super();
    this._isMounted = false;
    this.state = {
      label: EMPTY_VALUE,
      isPointsOnly: null,
      isLinesOnly: null,
    };
  }

  async _loadParams() {
    const label = await this.props.style.getField().getLabel();
    const isLinesOnly = await this.props.loadIsLinesOnly();
    const isPointsOnly = await this.props.loadIsPointsOnly();
    const newState = { label, isLinesOnly, isPointsOnly };
    if (this._isMounted && !_.isEqual(this.state, newState)) {
      this.setState(newState);
    }
  }

  componentDidUpdate() {
    this._loadParams();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadParams();
  }

  render() {
    if (this.state.label === EMPTY_VALUE) {
      return null;
    }
    return this.props.style.renderBreakedLegend({
      fieldLabel: this.state.label,
      isLinesOnly: this.state.isLinesOnly,
      isPointsOnly: this.state.isPointsOnly,
      symbolId: this.props.symbolId,
    });
  }
}
