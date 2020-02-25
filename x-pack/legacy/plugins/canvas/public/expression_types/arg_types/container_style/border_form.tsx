/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldNumber,
  EuiSuperSelect,
} from '@elastic/eui';
import { ColorPickerPopover } from '../../../components/color_picker_popover';
import { BorderStyle, isBorderStyle } from '../../../../types';
import { ArgTypesStrings } from '../../../../i18n';

export { BorderStyle } from '../../../../types';

export interface Arguments {
  borderRadius: string | number;
  borderStyle: BorderStyle;
  borderWidth: number;
  border: string;
}
export type ArgumentTypes = Arguments;
export type Argument = keyof Arguments;

const { ContainerStyle: strings } = ArgTypesStrings;

interface Props {
  onChange: <T extends Argument>(arg: T, val: ArgumentTypes[T]) => void;
  value: string;
  radius: string | number;
  colors: string[];
}

export const BorderForm: FunctionComponent<Props> = ({
  value = '',
  radius = '',
  onChange,
  colors,
}) => {
  const [borderWidth = '', borderStyle = '', borderColor = ''] = value.split(' ');

  const borderStyleVal = isBorderStyle(borderStyle) ? borderStyle : BorderStyle.NONE;
  const borderWidthVal = borderWidth ? borderWidth.replace('px', '') : '';
  const radiusVal = typeof radius === 'string' ? radius.replace('px', '') : radius;

  const namedChange = <T extends keyof Arguments>(name: T) => (val: Arguments[T]) => {
    if (name === 'borderWidth') {
      return onChange('border', `${val}px ${borderStyle} ${borderColor}`);
    }
    if (name === 'borderStyle') {
      if (val === '') {
        return onChange('border', `0px`);
      }
      return onChange('border', `${borderWidth} ${val} ${borderColor}`);
    }
    if (name === 'borderRadius') {
      if (val === '') {
        return onChange('borderRadius', `0px`);
      }
      return onChange('borderRadius', `${val}px`);
    }

    onChange(name, val);
  };

  const borderColorChange = (color: string) =>
    onChange('border', `${borderWidth} ${borderStyle} ${color}`);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={2}>
        <EuiFormRow label={strings.getThicknessLabel()} display="rowCompressed">
          <EuiFieldNumber
            compressed
            value={Number(borderWidthVal)}
            onChange={e => namedChange('borderWidth')(Number(e.target.value))}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={3}>
        <EuiFormRow label={strings.getStyleLabel()} display="rowCompressed">
          <EuiSuperSelect
            compressed
            valueOfSelected={borderStyleVal || 'none'}
            options={Object.values(BorderStyle).map(style => ({
              value: style,
              inputDisplay: <div style={{ height: 16, border: `4px ${style}` }} />,
            }))}
            onChange={namedChange('borderStyle')}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <EuiFormRow label={strings.getRadiusLabel()} display="rowCompressed">
          <EuiFieldNumber
            compressed
            value={Number(radiusVal)}
            onChange={e => namedChange('borderRadius')(e.target.value)}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiFormRow display="rowCompressed" label={strings.getColorLabel()} style={{ fontSize: 0 }}>
          <ColorPickerPopover
            value={borderColor}
            onChange={borderColorChange}
            colors={colors}
            anchorPosition="upCenter"
            ariaLabel={strings.getBorderTitle()}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

BorderForm.propTypes = {
  value: PropTypes.string,
  radius: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  colors: PropTypes.array.isRequired,
};
