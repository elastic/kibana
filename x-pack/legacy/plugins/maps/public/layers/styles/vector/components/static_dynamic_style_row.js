/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { VectorStyle } from '../vector_style';
import { i18n } from '@kbn/i18n';
import { FieldMetaOptionsPopover } from './field_meta_options_popover';
import { getVectorStyleLabel } from './get_vector_style_label';

import { EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiFormRow, EuiButtonToggle } from '@elastic/eui';

export class StaticDynamicStyleRow extends Component {
  // Store previous options locally so when type is toggled,
  // previous style options can be used.
  prevStaticStyleOptions = this.props.defaultStaticStyleOptions;
  prevDynamicStyleOptions = this.props.defaultDynamicStyleOptions;

  _canBeDynamic() {
    return this.props.fields.length > 0;
  }

  _isDynamic() {
    return this.props.styleProperty.isDynamic();
  }

  _getStyleOptions() {
    return this.props.styleProperty.getOptions();
  }

  _onFieldMetaOptionsChange = fieldMetaOptions => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        ...this._getStyleOptions(),
        fieldMetaOptions,
      },
    };
    this.props.handlePropertyChange(this.props.styleProperty.getStyleName(), styleDescriptor);
  };

  _onStaticStyleChange = options => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options,
    };
    this.props.handlePropertyChange(this.props.styleProperty.getStyleName(), styleDescriptor);
  };

  _onDynamicStyleChange = options => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options,
    };
    this.props.handlePropertyChange(this.props.styleProperty.getStyleName(), styleDescriptor);
  };

  _onTypeToggle = () => {
    if (this._isDynamic()) {
      // preserve current dynmaic style
      this.prevDynamicStyleOptions = this._getStyleOptions();
      // toggle to static style
      this._onStaticStyleChange(this.prevStaticStyleOptions);
      return;
    }

    // preserve current static style
    this.prevStaticStyleOptions = this._getStyleOptions();
    // toggle to dynamic style
    this._onDynamicStyleChange(this.prevDynamicStyleOptions);
  };

  _renderStyleSelector() {
    if (this._isDynamic()) {
      const DynamicSelector = this.props.DynamicSelector;
      return (
        <Fragment>
          <DynamicSelector
            fields={this.props.fields}
            onChange={this._onDynamicStyleChange}
            styleOptions={this._getStyleOptions()}
          />
          <FieldMetaOptionsPopover
            styleProperty={this.props.styleProperty}
            onChange={this._onFieldMetaOptionsChange}
          />
        </Fragment>
      );
    }

    const StaticSelector = this.props.StaticSelector;
    return (
      <StaticSelector
        onChange={this._onStaticStyleChange}
        styleOptions={this._getStyleOptions()}
        swatches={this.props.swatches}
      />
    );
  }

  render() {
    const isDynamic = this._isDynamic();
    const dynamicTooltipContent = isDynamic
      ? i18n.translate('xpack.maps.styles.staticDynamic.staticDescription', {
          defaultMessage: 'Use static styling properties to symbolize features.',
        })
      : i18n.translate('xpack.maps.styles.staticDynamic.dynamicDescription', {
          defaultMessage: 'Use property values to symbolize features.',
        });

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem
          className={isDynamic ? 'mapStaticDynamicSylingOption__dynamicSizeHack' : undefined}
        >
          <EuiFormRow
            label={getVectorStyleLabel(this.props.styleProperty.getStyleName())}
            display="rowCompressed"
          >
            {this._renderStyleSelector()}
          </EuiFormRow>
        </EuiFlexItem>
        {this._canBeDynamic() && (
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace display="centerCompressed">
              <EuiToolTip content={dynamicTooltipContent} delay="long">
                <EuiButtonToggle
                  size="s"
                  label={dynamicTooltipContent}
                  iconType="link"
                  onChange={this._onTypeToggle}
                  isEmpty={!isDynamic}
                  fill={isDynamic}
                  isIconOnly
                />
              </EuiToolTip>
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
}
