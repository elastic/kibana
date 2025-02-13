/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { isEqual } from 'lodash';
import { ColorPalette } from '../../../common/lib/palettes';
import { CustomColorPalette } from './types';

export const findPalette = (
  colorPalette: ColorPalette | CustomColorPalette | null,
  colorPalettes: Array<ColorPalette | CustomColorPalette> = []
) => {
  const palette = colorPalettes.filter((cp) => cp.id === colorPalette?.id)[0] ?? null;
  if (palette === null) {
    return colorPalettes.filter((cp) => isEqual(cp.colors, colorPalette?.colors))[0] ?? null;
  }

  return palette;
};

export const prepareColorPalette = ({
  id,
  label,
  gradient,
  colors,
}: ColorPalette | CustomColorPalette): EuiColorPalettePickerPaletteProps => ({
  value: id,
  title: label,
  type: gradient ? 'gradient' : 'fixed',
  palette: colors,
});
