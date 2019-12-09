/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { dynamicColorShape } from '../style_option_shapes';
import { FieldSelect, fieldShape } from '../field_select';
import { ColorRampSelect } from './color_ramp_select';
import { EuiSpacer } from '@elastic/eui';

export class DynamicColorSelection extends React.Component {


  onFieldChange = ({ field }) => {
    if (field.dataType === 'string') {
      this.props.onChange({ ...this.props.styleOptions, field });
    } else {
      this.props.onChange({ ...this.props.styleOptions, field });
    }
  };

  onColorChange = colorOptions => {
    this.props.onChange({ ...this.props.styleOptions, ...colorOptions });
  };

  _renderColorRampSelect() {
    if (!this.props.styleOptions.field) {
      return null;
    }

    return (
      <ColorRampSelect
        fieldDataType={this.props.styleOptions.field.dataType}
        onChange={this.onColorChange}
        color={this.props.styleOptions.color}
        customColorRamp={this.props.styleOptions.customColorRamp}
        useCustomColorRamp={_.get(this.props.styleOptions, 'useCustomColorRamp', false)}
        compressed
      />
    );
  }

  render() {
    const { ordinalAndStringFields, styleOptions } = this.props;
    return (
      <Fragment>
        <FieldSelect
          fields={ordinalAndStringFields}
          selectedFieldName={_.get(styleOptions, 'field.name')}
          onChange={this.onFieldChange}
          compressed
        />
        <EuiSpacer size="s"/>
        {this._renderColorRampSelect()}
      </Fragment>
    );
  }
}

DynamicColorSelection.propTypes = {
  ordinalFields: PropTypes.arrayOf(fieldShape).isRequired,
  styleOptions: dynamicColorShape.isRequired,
  onChange: PropTypes.func.isRequired,
};
