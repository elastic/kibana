/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { rangeShape } from '../style_option_shapes';
import { getVectorStyleLabel } from '../get_vector_style_label';
import { StyleLegendRow } from '../../../components/style_legend_row';

const EMPTY_VALUE = '';

export class StylePropertyLegendRow extends Component {

  _formatValue = value => {
    if (!this.props.fieldFormatter || value === EMPTY_VALUE) {
      return value;
    }

    return this.props.fieldFormatter(value);
  }

  render() {
    const { range, style } = this.props;

    const min = this._formatValue(_.get(range, 'min', EMPTY_VALUE));
    const minLabel = this.props.style.isFieldMetaEnabled() && range && range.isMinOutsideStdRange ? `< ${min}` : min;

    const max = this._formatValue(_.get(range, 'max', EMPTY_VALUE));
    const maxLabel = this.props.style.isFieldMetaEnabled() && range && range.isMaxOutsideStdRange ? `> ${max}` : max;

    return (
      <StyleLegendRow
        header={style.renderHeader()}
        minLabel={minLabel}
        maxLabel={maxLabel}
        propertyLabel={getVectorStyleLabel(style.getStyleName())}
        fieldLabel={this.props.label}
      />
    );
  }
}

StylePropertyLegendRow.propTypes = {
  label: PropTypes.string,
  fieldFormatter: PropTypes.func,
  range: rangeShape,
  style: PropTypes.object
};
