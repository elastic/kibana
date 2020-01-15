/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { ColorMapSelect } from './color_map_select';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CATEGORICAL_DATA_TYPES, COLOR_MAP_TYPE } from '../../../../../../common/constants';
import { COLOR_GRADIENTS, COLOR_PALETTES } from '../../../color_utils';
import { i18n } from '@kbn/i18n';

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
    const colorMapType = CATEGORICAL_DATA_TYPES.includes(dataType)
      ? COLOR_MAP_TYPE.CATEGORICAL
      : COLOR_MAP_TYPE.ORDINAL;
    if (this._isMounted && this.state.colorMapType !== colorMapType) {
      this.setState({ colorMapType }, () => {
        const options = this.props.styleProperty.getOptions();
        this.props.onDynamicStyleChange(this.props.styleProperty.getStyleName(), {
          ...options,
          type: colorMapType,
        });
      });
    }
  }

  _getColorSelector() {
    const { onDynamicStyleChange, styleProperty } = this.props;
    const styleOptions = styleProperty.getOptions();

    if (!styleOptions.field || !styleOptions.field.name) {
      return;
    }

    let colorSelect;
    const onColorChange = colorOptions => {
      const newColorOptions = {
        type: colorOptions.type,
      };
      if (colorOptions.type === COLOR_MAP_TYPE.ORDINAL) {
        newColorOptions.useCustomColorRamp = colorOptions.useCustomColorMap;
        newColorOptions.customColorRamp = colorOptions.customColorMap;
        newColorOptions.color = colorOptions.color;
      } else {
        newColorOptions.useCustomColorPalette = colorOptions.useCustomColorMap;
        newColorOptions.customColorPalette = colorOptions.customColorMap;
        newColorOptions.colorCategory = colorOptions.color;
      }

      onDynamicStyleChange(styleProperty.getStyleName(), {
        ...styleOptions,
        ...newColorOptions,
      });
    };

    if (this.state.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      const customOptionLabel = i18n.translate('xpack.maps.style.customColorRampLabel', {
        defaultMessage: 'Custom color ramp',
      });
      colorSelect = (
        <ColorMapSelect
          colorMapOptions={COLOR_GRADIENTS}
          customOptionLabel={customOptionLabel}
          onChange={options => onColorChange(options)}
          colorMapType={COLOR_MAP_TYPE.ORDINAL}
          color={styleOptions.color}
          customColorMap={styleOptions.customColorRamp}
          useCustomColorMap={_.get(styleOptions, 'useCustomColorRamp', false)}
          compressed
        />
      );
    } else if (this.state.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
      const customOptionLabel = i18n.translate('xpack.maps.style.customColorPaletteLabel', {
        defaultMessage: 'Custom color palette',
      });
      colorSelect = (
        <ColorMapSelect
          colorMapOptions={COLOR_PALETTES}
          customOptionLabel={customOptionLabel}
          onChange={options => onColorChange(options)}
          colorMapType={COLOR_MAP_TYPE.CATEGORICAL}
          color={styleOptions.colorCategory}
          customColorMap={styleOptions.customColorPalette}
          useCustomColorMap={_.get(styleOptions, 'useCustomColorPalette', false)}
          compressed
        />
      );
    }
    return colorSelect;
  }

  render() {
    const { fields, onDynamicStyleChange, staticDynamicSelect, styleProperty } = this.props;
    const styleOptions = styleProperty.getOptions();
    const onFieldChange = options => {
      const field = options.field;
      onDynamicStyleChange(styleProperty.getStyleName(), { ...styleOptions, field });
    };

    const colorSelect = this._getColorSelector();

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
      </Fragment>
    );
  }
}
