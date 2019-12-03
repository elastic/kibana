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
    showFieldMetaPopover: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadShowFieldMetaPopover();
  }

  componentDidUpdate() {
    this._loadShowFieldMetaPopover();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadShowFieldMetaPopover() {
    const showFieldMetaPopover = await this.props.styleProperty.showFieldMetaPopover();
    if (this._isMounted && showFieldMetaPopover !== this.state.showFieldMetaPopover) {
      this.setState({ showFieldMetaPopover });
    }
  }

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

  _getFieldMetaOptions = () => {
    return this.props.styleProperty.getFieldMetaOptions();
  }

  _onIsEnabledChange = event => {
    this.props.onChange({
      ...this._getFieldMetaOptions(),
      isEnabled: !event.target.checked,
    });
  };

  _renderButton() {
    return (
      <EuiButtonIcon
        onClick={this._togglePopover}
        size="xs"
        iconType="gear"
        aria-label={i18n.translate('xpack.maps.styles.fieldMetaOptions.popoverToggle', {
          defaultMessage: 'Field meta options popover toggle',
        })}
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
              defaultMessage: 'Clamp range to on-screen values',
            })}
            checked={!this._getFieldMetaOptions().isEnabled}
            onChange={this._onIsEnabledChange}
            compressed
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  render() {
    if (!this.state.showFieldMetaPopover) {
      return null;
    }

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
