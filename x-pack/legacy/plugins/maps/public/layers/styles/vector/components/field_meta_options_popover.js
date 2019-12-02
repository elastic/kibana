/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiPopover, } from '@elastic/eui';

export class FieldMetaOptionsPopover extends Component {

  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  _renderButton() {
    return (
      <EuiButtonEmpty
        onClick={this._togglePopover}
        size="xs"
        iconType="gear"
      >
        <FormattedMessage
          id="xpack.maps.styles.fieldMetaOptions.togglePopoverLabel"
          defaultMessage="Advanced config"
        />
      </EuiButtonEmpty>
    );
  }

  render() {
    return (
      <EuiPopover
        id="fieldMetaOptionsPopover"
        anchorPosition="leftCenter"
        button={this._renderButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
      >
        <div>
          stuff goes here
        </div>
      </EuiPopover>
    );
  }
}
