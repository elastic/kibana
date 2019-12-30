/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
const EMPTY_VALUE = '';

export class OrdinalLegend extends React.Component {
  constructor() {
    super();
    this._isMounted = false;
    this.state = {
      label: EMPTY_VALUE,
    };
  }

  async _loadParams() {
    const label = await this.props.style.getField().getLabel();
    const newState = { label };
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
    const fieldMeta = this.props.style.getFieldMeta();

    let minLabel = EMPTY_VALUE;
    let maxLabel = EMPTY_VALUE;
    if (fieldMeta) {
      const range = { min: fieldMeta.min, max: fieldMeta.max };
      const min = this.props.style.formatField(_.get(range, 'min', EMPTY_VALUE));
      minLabel =
        this.props.style.isFieldMetaEnabled() && range && range.isMinOutsideStdRange
          ? `< ${min}`
          : min;

      const max = this.props.style.formatField(_.get(range, 'max', EMPTY_VALUE));
      maxLabel =
        this.props.style.isFieldMetaEnabled() && range && range.isMaxOutsideStdRange
          ? `> ${max}`
          : max;
    }

    return (
      <RangedStyleLegendRow
        header={this.props.style.renderRangeLegendHeader()}
        minLabel={minLabel}
        maxLabel={maxLabel}
        propertyLabel={this.props.style.getDisplayStyleName()}
        fieldLabel={this.state.label}
      />
    );
  }
}
