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

export function DynamicColorForm({
  fields,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
}) {
  const styleOptions = styleProperty.getOptions();

  const onColorMapSelect = ({ color, customColorMap, type, useCustomColorMap }) => {
    const newColorOptions = {
      ...styleOptions,
      type,
    };
    if (type === COLOR_MAP_TYPE.ORDINAL) {
      newColorOptions.useCustomColorRamp = useCustomColorMap;
      newColorOptions.customColorRamp = customColorMap;
      newColorOptions.color = color;
    } else {
      newColorOptions.useCustomColorPalette = useCustomColorMap;
      newColorOptions.customColorPalette = customColorMap;
      newColorOptions.colorCategory = color;
    }

    onDynamicStyleChange(styleProperty.getStyleName(), newColorOptions);
  };

  const onFieldChange = async ({ field }) => {
    const { name, origin, type } = field;
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      field: { name, origin },
      type: CATEGORICAL_DATA_TYPES.includes(type)
        ? COLOR_MAP_TYPE.CATEGORICAL
        : COLOR_MAP_TYPE.ORDINAL,
    });
  };

  const renderColorMapSelect = () => {
    if (!styleOptions.field || !styleOptions.field.name) {
      return null;
    }

    if (styleProperty.isOrdinal()) {
      return (
        <ColorMapSelect
          colorMapOptions={COLOR_GRADIENTS}
          customOptionLabel={i18n.translate('xpack.maps.style.customColorRampLabel', {
            defaultMessage: 'Custom color ramp',
          })}
          onChange={onColorMapSelect}
          colorMapType={COLOR_MAP_TYPE.ORDINAL}
          color={styleOptions.color}
          customColorMap={styleOptions.customColorRamp}
          useCustomColorMap={_.get(styleOptions, 'useCustomColorRamp', false)}
          styleProperty={styleProperty}
        />
      );
    }

    return (
      <ColorMapSelect
        colorMapOptions={COLOR_PALETTES}
        customOptionLabel={i18n.translate('xpack.maps.style.customColorPaletteLabel', {
          defaultMessage: 'Custom color palette',
        })}
        onChange={onColorMapSelect}
        colorMapType={COLOR_MAP_TYPE.CATEGORICAL}
        color={styleOptions.colorCategory}
        customColorMap={styleOptions.customColorPalette}
        useCustomColorMap={_.get(styleOptions, 'useCustomColorPalette', false)}
        styleProperty={styleProperty}
      />
    );
  };

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>{staticDynamicSelect}</EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            fields={fields}
            selectedFieldName={styleProperty.getFieldName()}
            onChange={onFieldChange}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {renderColorMapSelect()}
    </Fragment>
  );
}
