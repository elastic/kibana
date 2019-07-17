/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from '../vector_style';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiFormRow,
  EuiButtonToggle
} from '@elastic/eui';

export class StaticDynamicStyleRow extends React.Component {

  // Store previous options locally so when type is toggled,
  // previous style options can be used.
  prevStaticStyleOptions = this.props.defaultStaticStyleOptions;
  prevDynamicStyleOptions = this.props.defaultDynamicStyleOptions;

  _canBeDynamic() {
    return this.props.ordinalFields.length > 0;
  }

  _isDynamic() {
    if (!this.props.styleDescriptor) {
      return false;
    }
    return this.props.styleDescriptor.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  _getStyleOptions() {
    return _.get(this.props, 'styleDescriptor.options');
  }

  _onStaticStyleChange = options => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options
    };
    this.props.handlePropertyChange(this.props.property, styleDescriptor);
  }

  _onDynamicStyleChange = options => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options
    };
    this.props.handlePropertyChange(this.props.property, styleDescriptor);
  }

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
  }

  _renderStyleSelector() {
    if (this._isDynamic()) {
      const DynamicSelector = this.props.DynamicSelector;
      return (
        <DynamicSelector
          ordinalFields={this.props.ordinalFields}
          onChange={this._onDynamicStyleChange}
          styleOptions={this._getStyleOptions()}
        />
      );
    }

    const StaticSelector = this.props.StaticSelector;
    return (
      <StaticSelector
        onChange={this._onStaticStyleChange}
        styleOptions={this._getStyleOptions()}
      />
    );
  }

  render() {
    const isDynamic = this._isDynamic();
    const dynamicTooltipContent =
      isDynamic ?
        i18n.translate('xpack.maps.styles.staticDynamic.staticDescription', {
          defaultMessage: 'Use static styling properties to symbolize features.'
        })  :
        i18n.translate('xpack.maps.styles.staticDynamic.dynamicDescription', {
          defaultMessage: 'Use property values to symbolize features.'
        });

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem className={isDynamic ? 'mapStaticDynamicSylingOption__dynamicSizeHack' : undefined}>
          <EuiFormRow label={this.props.label && this.props.label}>
            {this._renderStyleSelector()}
          </EuiFormRow>
        </EuiFlexItem>
        {this._canBeDynamic() &&
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiToolTip
                content={dynamicTooltipContent}
                delay="long"
              >
                <EuiButtonToggle
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
        }
      </EuiFlexGroup>
    );
  }
}
