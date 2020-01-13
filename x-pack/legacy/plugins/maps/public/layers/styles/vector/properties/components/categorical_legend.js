/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
const EMPTY_VALUE = '';

export class CategoricalLegend extends React.Component {
  state = {
    label: EMPTY_VALUE,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadParams();
  }

  componentDidUpdate() {
    this._loadParams();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadParams() {
    const label = await this.props.style.getField().getLabel();
    const newState = { label };
    if (this._isMounted && !_.isEqual(this.state, newState)) {
      this.setState(newState);
    }
  }

  render() {
    if (this.state.label === EMPTY_VALUE) {
      return null;
    }
    return this.props.style.renderBreakedLegend({
      fieldLabel: this.state.label,
      isLinesOnly: this.props.isLinesOnly,
      isPointsOnly: this.props.isPointsOnly,
      symbolId: this.props.symbolId,
    });
  }
}
