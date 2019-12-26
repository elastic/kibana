/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
import { VECTOR_STYLES } from '../../vector_style_defaults';
const EMPTY_VALUE = '';

export class DynamicLegendRow extends React.Component {
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

  _formatValue(value) {
    if (value === EMPTY_VALUE) {
      return value;
    }
    return this.props.style.formatField(value);
  }

  _renderRangeLegend() {
    const fieldMeta = this.props.style.getFieldMeta();

    let minLabel = EMPTY_VALUE;
    let maxLabel = EMPTY_VALUE;
    if (fieldMeta) {
      const range = { min: fieldMeta.min, max: fieldMeta.max };
      const min = this._formatValue(_.get(range, 'min', EMPTY_VALUE));
      minLabel =
        this.props.style.isFieldMetaEnabled() && range && range.isMinOutsideStdRange
          ? `< ${min}`
          : min;

      const max = this._formatValue(_.get(range, 'max', EMPTY_VALUE));
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

  _renderBreakedLegend() {
    if (this.props.style.getStyleName() === VECTOR_STYLES.LABEL_TEXT) {
      //It is not clear how to render breaked legend yet for text.
      //Cannot rely on small-legend icon to provide a similar preview
      return null;
    }

    return this.props.style.renderBreakedLegend({
      fieldLabel: this.state.label,
      isLinesOnly: this.state.isLinesOnly,
      isPointsOnly: this.state.isPointsOnly,
      symbolId: this.props.symbolId,
    });
  }

  render() {
    if (this.props.style.isRanged()) {
      return this._renderRangeLegend();
    } else if (this.props.style.hasBreaks()) {
      return this._renderBreakedLegend();
    } else {
      return null;
    }
  }
}
