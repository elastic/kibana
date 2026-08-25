/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MbValidatedColorPicker } from './mb_validated_color_picker';
import { OTHER_CATEGORY_DEFAULT_COLOR, OTHER_CATEGORY_LABEL } from '../../style_util';

interface Props {
  onChange: (color: string) => void;
  color?: string;
}

export function OtherCategoryColorPicker(props: Props) {
  const { euiTheme } = useEuiTheme();

  const OTHER_CATEGORY_SWATCHES = [
    euiTheme.colors.textInverse,
    euiTheme.colors.textDisabled,
    euiTheme.colors.textSubdued,
    euiTheme.colors.textParagraph,
    euiTheme.colors.textHeading,
  ];

  return (
    <EuiFormRow>
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.maps.colorStops.otherCategoryColorPickerTooltip', {
          defaultMessage:
            'When the selected field has more terms than colors in the palette, the rest of the terms are grouped under "Other" category. Select a palette with more colors to increase the number of terms colored in your map',
        })}
      >
        <MbValidatedColorPicker
          swatches={OTHER_CATEGORY_SWATCHES}
          prepend={OTHER_CATEGORY_LABEL}
          onChange={props.onChange}
          color={props.color ? props.color : OTHER_CATEGORY_DEFAULT_COLOR}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
