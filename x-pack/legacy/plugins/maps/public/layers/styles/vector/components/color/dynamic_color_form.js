/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { ColorRampSelect } from './color_ramp_select';
import { ColorPaletteSelect } from './color_palette_select';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';
import { OrdinalFieldMetaOptionsPopover } from '../ordinal_field_meta_options_popover';

export class DynamicColorForm extends React.Component {
  state = {
    colorMapType: COLOR_MAP_TYPE.ORDINAL,
  };

  constructor() {
    super();
    this._isMounted = false;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadColorMapType();
  }

  componentDidUpdate() {
    this._loadColorMapType();
  }

  async _loadColorMapType() {
    const field = this.props.styleProperty.getField();
    if (!field) {
      return;
    }
    const dataType = await field.getDataType();
    const colorMapType =
      dataType === 'string' ? COLOR_MAP_TYPE.CATEGORICAL : COLOR_MAP_TYPE.ORDINAL;
    if (this._isMounted && this.state.colorMapType !== colorMapType) {
      this.setState({ colorMapType });
    }
  }

  _onFieldMetaOptionsChange = fieldMetaOptions => {
    const options = {
      ...this.props.styleProperty.getOptions(),
      fieldMetaOptions,
    };
    this.props.onDynamicStyleChange(this.props.styleProperty.getStyleName(), options);
  };

  _getColorSelector() {
    const { onDynamicStyleChange, styleProperty } = this.props;
    const styleOptions = styleProperty.getOptions();

    let colorSelect;
    if (styleOptions.field && styleOptions.field.name) {
      const onColorChange = colorOptions => {
        const newOptions = {
          ...styleOptions,
          ...colorOptions,
        };

        onDynamicStyleChange(styleProperty.getStyleName(), newOptions);
      };
      if (this.state.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
        colorSelect = (
          <ColorRampSelect
            onChange={options => onColorChange(options)}
            color={styleOptions.color}
            customColorRamp={styleOptions.customColorRamp}
            useCustomColorRamp={_.get(styleOptions, 'useCustomColorRamp', false)}
            compressed
          />
        );
      } else if (this.state.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
        colorSelect = (
          <ColorPaletteSelect
            onChange={options => onColorChange(options)}
            color={styleOptions.color}
            customColorPalette={styleOptions.customColorPalette}
            useCustomColorPalette={_.get(styleOptions, 'useCustomColorPalette', false)}
            compressed
          />
        );
      }
      return colorSelect;
    }
  }

  render() {
    const { fields, onDynamicStyleChange, staticDynamicSelect, styleProperty } = this.props;
    const styleOptions = styleProperty.getOptions();
    const onFieldChange = ({ field }) => {
      onDynamicStyleChange(styleProperty.getStyleName(), { ...styleOptions, field });
    };

    const colorSelect = this._getColorSelector();

    const fieldMetaOptionsPopover =
      this.state.colorMapType === COLOR_MAP_TYPE.ORDINAL && styleProperty.supportsFieldMeta() ? (
        <OrdinalFieldMetaOptionsPopover
          styleProperty={this.props.styleProperty}
          onChange={this._onFieldMetaOptionsChange}
        />
      ) : null;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>{staticDynamicSelect}</EuiFlexItem>
          <EuiFlexItem>
            <FieldSelect
              fields={fields}
              selectedFieldName={_.get(styleOptions, 'field.name')}
              onChange={onFieldChange}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {colorSelect}
        {fieldMetaOptionsPopover}
      </Fragment>
    );
  }
}
