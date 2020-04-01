/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { getVectorStyleLabel, getDisabledByMessage } from './get_vector_style_label';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiToolTip,
} from '@elastic/eui';
import { STYLE_TYPE } from '../../../../../common/constants';
import { i18n } from '@kbn/i18n';

export class StylePropEditor extends Component {
  _prevStaticStyleOptions = this.props.defaultStaticStyleOptions;
  _prevDynamicStyleOptions = this.props.defaultDynamicStyleOptions;

  _onTypeToggle = () => {
    if (this.props.styleProperty.isDynamic()) {
      // preserve current dynmaic style
      this._prevDynamicStyleOptions = this.props.styleProperty.getOptions();
      // toggle to static style
      this.props.onStaticStyleChange(
        this.props.styleProperty.getStyleName(),
        this._prevStaticStyleOptions
      );
    } else {
      // preserve current static style
      this._prevStaticStyleOptions = this.props.styleProperty.getOptions();
      // toggle to dynamic style
      this.props.onDynamicStyleChange(
        this.props.styleProperty.getStyleName(),
        this._prevDynamicStyleOptions
      );
    }
  };

  _onFieldMetaOptionsChange = fieldMetaOptions => {
    const options = {
      ...this.props.styleProperty.getOptions(),
      fieldMetaOptions,
    };
    this.props.onDynamicStyleChange(this.props.styleProperty.getStyleName(), options);
  };

  renderStaticDynamicSelect() {
    const options = [
      {
        value: STYLE_TYPE.STATIC,
        text: this.props.customStaticOptionLabel
          ? this.props.customStaticOptionLabel
          : i18n.translate('xpack.maps.styles.staticDynamicSelect.staticLabel', {
              defaultMessage: 'Fixed',
            }),
      },
      {
        value: STYLE_TYPE.DYNAMIC,
        text: i18n.translate('xpack.maps.styles.staticDynamicSelect.dynamicLabel', {
          defaultMessage: 'By value',
        }),
      },
    ];

    return (
      <EuiSelect
        options={options}
        value={this.props.styleProperty.isDynamic() ? STYLE_TYPE.DYNAMIC : STYLE_TYPE.STATIC}
        onChange={this._onTypeToggle}
        disabled={this.props.disabled || this.props.fields.length === 0}
        aria-label={i18n.translate('xpack.maps.styles.staticDynamicSelect.ariaLabel', {
          defaultMessage: 'Select to style by fixed value or by data value',
        })}
        compressed
        data-test-subj={`staticDynamicSelect_${this.props.styleProperty.getStyleName()}`}
      />
    );
  }

  render() {
    const fieldMetaOptionsPopover = this.props.styleProperty.renderFieldMetaPopover(
      this._onFieldMetaOptionsChange
    );

    const staticDynamicSelect = this.renderStaticDynamicSelect();

    const stylePropertyForm = this.props.disabled ? (
      <EuiToolTip
        anchorClassName="mapStyleFormDisabledTooltip"
        content={getDisabledByMessage(this.props.disabledBy)}
      >
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
            {staticDynamicSelect}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFieldText compressed disabled />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    ) : (
      <Fragment>
        {React.cloneElement(this.props.children, {
          staticDynamicSelect,
        })}
        {fieldMetaOptionsPopover}
      </Fragment>
    );

    return (
      <EuiFormRow
        label={getVectorStyleLabel(this.props.styleProperty.getStyleName())}
        display="rowCompressed"
      >
        {stylePropertyForm}
      </EuiFormRow>
    );
  }
}
