/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiButtonIcon, EuiFormRow, EuiPopover, EuiRange, EuiSwitch } from '@elastic/eui';
import { VECTOR_STYLES } from '../vector_style_defaults';
import { i18n } from '@kbn/i18n';

function getIsEnableToggleLabel(styleName) {
  switch (styleName) {
    case VECTOR_STYLES.FILL_COLOR:
    case VECTOR_STYLES.LINE_COLOR:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.colorLabel', {
        defaultMessage: 'Calculate color ramp range from indices',
      });
    case VECTOR_STYLES.LINE_WIDTH:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.widthLabel', {
        defaultMessage: 'Calculate border width range from indices',
      });
    case VECTOR_STYLES.ICON_SIZE:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.sizeLabel', {
        defaultMessage: 'Calculate symbol size range from indices',
      });
    default:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.defaultLabel', {
        defaultMessage: 'Calculate symbolization range from indices',
      });
  }
}

export class FieldMetaOptionsPopover extends Component {
  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onIsEnabledChange = event => {
    this.props.onChange({
      ...this.props.styleProperty.getFieldMetaOptions(),
      isEnabled: event.target.checked,
    });
  };

  _onSigmaChange = event => {
    this.props.onChange({
      ...this.props.styleProperty.getFieldMetaOptions(),
      sigma: event.target.value,
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
        <EuiFormRow display="columnCompressedSwitch">
          <EuiSwitch
            label={getIsEnableToggleLabel(this.props.styleProperty.getStyleName())}
            checked={this.props.styleProperty.getFieldMetaOptions().isEnabled}
            onChange={this._onIsEnabledChange}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.styles.fieldMetaOptions.sigmaLabel', {
            defaultMessage: 'Sigma',
          })}
          display="columnCompressed"
        >
          <EuiRange
            min={1}
            max={5}
            step={0.25}
            value={this.props.styleProperty.getFieldMetaOptions().sigma}
            onChange={this._onSigmaChange}
            disabled={!this.props.styleProperty.getFieldMetaOptions().isEnabled}
            showTicks
            tickInterval={1}
            compressed
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  render() {
    if (!this.props.styleProperty.supportsFieldMeta()) {
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
