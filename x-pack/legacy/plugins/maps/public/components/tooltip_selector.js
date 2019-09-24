/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiTitle,
  EuiTextAlign,
  EuiSpacer,
} from '@elastic/eui';
import { AddTooltipFieldPopover } from './add_tooltip_field_popover';
import { FormattedMessage } from '@kbn/i18n/react';


export class TooltipSelector extends Component {

  _addProperty = (propertyName) => {
    //const property = { name: propertyName };
    const property = propertyName;
    if (!this.props.tooltipProperties) {
      this.props.onChange([property]);
    } else {
      this.props.onChange([...this.props.tooltipProperties, property]);
    }
  }

  _renderProperties() {
    console.log(this.props.tooltipProperties);
    if (!this.props.tooltipProperties) {
      return null;
    }

    return this.props.tooltipProperties.join(',');
  }

  render() {
    return (
      <div>
        <EuiTitle size="xxs">
          <h6>
            <FormattedMessage id="xpack.maps.tooltipSelectorLabel" defaultMessage="Fields to display in tooltip" />
          </h6>
        </EuiTitle>
        <EuiSpacer size="xs" />

        {this._renderProperties()}
        <EuiSpacer size="xs" />

        <EuiTextAlign textAlign="center">
          <AddTooltipFieldPopover
            onSelect={this._addProperty}
            fields={this.props.fields}
          />
        </EuiTextAlign>
      </div>
    );
  }
}
