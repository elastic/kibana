/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
import { getVectorStyleLabel } from '../../components/get_vector_style_label';

const EMPTY_VALUE = '';
async function formatValue(fieldFormatter, fieldName, value) {
  if (!fieldFormatter || value === EMPTY_VALUE) {
    return value;
  }
  return await fieldFormatter(fieldName, value);
}

export class DynamicLegendRow extends React.Component {
  constructor() {
    super();
    this._isMounted = false;
    this.state = {
      label: EMPTY_VALUE,
      minLabel: EMPTY_VALUE,
      maxLabel: EMPTY_VALUE,
    };
  }

  async _loadParams() {
    const label = await this.props.style.getField().getLabel();
    const fieldMeta = this.props.style.getFieldMeta();
    const newState = { label };

    if (fieldMeta) {
      const range = { min: fieldMeta.min, max: fieldMeta.max };
      const fieldName = this.props.style.getField().getName();
      const min = await formatValue(
        this.props.formatField,
        fieldName,
        _.get(range, 'min', EMPTY_VALUE)
      );
      const minLabel =
        this.props.style.isFieldMetaEnabled() && range && range.isMinOutsideStdRange
          ? `< ${min}`
          : min;

      const max = await formatValue(
        this.props.formatField,
        fieldName,
        _.get(range, 'max', EMPTY_VALUE)
      );
      const maxLabel =
        this.props.style.isFieldMetaEnabled() && range && range.isMaxOutsideStdRange
          ? `> ${max}`
          : max;

      newState.minLabel = minLabel;
      newState.maxLabel = maxLabel;
    } else {
      newState.minLabel = EMPTY_VALUE;
      newState.maxLabel = EMPTY_VALUE;
    }

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
    return (
      <RangedStyleLegendRow
        header={this.props.style.renderStylePropertyLegendHeader()}
        minLabel={this.state.minLabel}
        maxLabel={this.state.maxLabel}
        propertyLabel={getVectorStyleLabel(this.props.style.getStyleName())}
        fieldLabel={this.state.label}
      />
    );
  }
}
