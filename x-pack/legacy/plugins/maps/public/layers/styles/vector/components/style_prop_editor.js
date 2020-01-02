/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { FieldMetaOptionsPopover } from './field_meta_options_popover';
import { getVectorStyleLabel } from './get_vector_style_label';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { VectorStyle } from '../vector_style';
import { i18n } from '@kbn/i18n';

export class StylePropEditor extends Component {
  prevStaticStyleOptions = this.props.defaultStaticStyleOptions;
  prevDynamicStyleOptions = this.props.defaultDynamicStyleOptions;

  _onTypeToggle = () => {
    if (this.props.styleProperty.isDynamic()) {
      // preserve current dynmaic style
      this.prevDynamicStyleOptions = this.props.styleProperty.getOptions();
      // toggle to static style
      this.props.onStaticStyleChange(
        this.props.styleProperty.getStyleName(),
        this.prevStaticStyleOptions
      );
      return;
    }

    // preserve current static style
    this.prevStaticStyleOptions = this.props.styleProperty.getOptions();
    // toggle to dynamic style
    this.props.onDynamicStyleChange(
      this.props.styleProperty.getStyleName(),
      this.prevDynamicStyleOptions
    );
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
        value: VectorStyle.STYLE_TYPE.STATIC,
        text: this.props.customStaticOptionLabel
          ? this.props.customStaticOptionLabel
          : i18n.translate('xpack.maps.styles.staticDynamicSelect.staticLabel', {
              defaultMessage: 'Fixed',
            }),
      },
      {
        value: VectorStyle.STYLE_TYPE.DYNAMIC,
        text: i18n.translate('xpack.maps.styles.staticDynamicSelect.dynamicLabel', {
          defaultMessage: 'By value',
        }),
      },
    ];

    return (
      <EuiSelect
        options={options}
        value={
          this.props.styleProperty.isDynamic()
            ? VectorStyle.STYLE_TYPE.DYNAMIC
            : VectorStyle.STYLE_TYPE.STATIC
        }
        onChange={this._onTypeToggle}
        disabled={this.props.fields.length === 0}
        aria-label={i18n.translate('xpack.maps.styles.staticDynamicSelect.ariaLabel', {
          defaultMessage: 'Select to style by fixed value or by data value',
        })}
        compressed
      />
    );
  }

  render() {
    const fieldMetaOptionsPopover = this.props.styleProperty.isDynamic() ? (
      <FieldMetaOptionsPopover
        styleProperty={this.props.styleProperty}
        onChange={this._onFieldMetaOptionsChange}
      />
    ) : null;

    return (
      <EuiFormRow
        label={getVectorStyleLabel(this.props.styleProperty.getStyleName())}
        display="rowCompressed"
      >
        <Fragment>
          {React.cloneElement(this.props.children, {
            staticDynamicSelect: this.renderStaticDynamicSelect(),
          })}
          {fieldMetaOptionsPopover}
        </Fragment>
      </EuiFormRow>
    );
  }
}
