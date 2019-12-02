/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiFormRow,
  EuiPopover,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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

  _onIsEnabledChange = event => {
    this.props.onChange({
      ...this.props.fieldMetaOptions,
      isEnabled: !event.target.checked,
    });
  };

  _renderButton() {
    return (
      <EuiButtonIcon
        onClick={this._togglePopover}
        size="xs"
        iconType="gear"
      />
    );
  }

  _renderContent() {
    return (
      <Fragment>
        <EuiFormRow
          display="columnCompressedSwitch"
        >
          <EuiSwitch
            label={i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabledLabel', {
              defaultMessage: 'Clamp range to on-screen features',
            })}
            checked={!this.props.fieldMetaOptions.isEnabled}
            onChange={this._onIsEnabledChange}
            compressed
          />
        </EuiFormRow>
      </Fragment>
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
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
