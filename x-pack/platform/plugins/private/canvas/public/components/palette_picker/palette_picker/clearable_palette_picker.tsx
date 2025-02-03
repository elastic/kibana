/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiColorPalettePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { ClearableComponentProps } from '../types';
import { findPalette, prepareColorPalette } from '../utils';

const strings = {
  getEmptyPaletteLabel: () =>
    i18n.translate('xpack.canvas.palettePicker.emptyPaletteLabel', {
      defaultMessage: 'None',
    }),
};

export const ClearablePalettePicker: FC<ClearableComponentProps> = (props) => {
  const { palette, palettes, onChange = () => {} } = props;
  const colorPalettes = palettes.map(prepareColorPalette);

  const onPickerChange = (value: string) => {
    const canvasPalette = palettes.find((item) => item.id === value);
    onChange(canvasPalette || null);
  };

  const foundPalette = findPalette(palette ?? null, palettes);

  return (
    <EuiColorPalettePicker
      id={props.id}
      compressed={true}
      palettes={[
        {
          value: 'clear',
          title: strings.getEmptyPaletteLabel(),
          type: 'text',
        },
        ...colorPalettes,
      ]}
      onChange={onPickerChange}
      valueOfSelected={foundPalette?.id ?? 'clear'}
    />
  );
};
