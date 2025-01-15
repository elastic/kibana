/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColorPalette } from '../../../common/lib/palettes';

export type CustomColorPalette = ColorPalette<'custom'>;

export interface RequiredProps {
  id?: string;
  onChange?: (palette: ColorPalette | CustomColorPalette) => void;
  palette: ColorPalette | CustomColorPalette;
  clearable?: false;
  additionalPalettes?: Array<ColorPalette | CustomColorPalette>;
}

export interface ClearableProps {
  id?: string;
  onChange?: (palette: ColorPalette | CustomColorPalette | null) => void;
  palette: ColorPalette | CustomColorPalette | null;
  clearable: true;
  additionalPalettes?: Array<ColorPalette | CustomColorPalette>;
}

export type PalettePickerProps = RequiredProps | ClearableProps;
export type StopsPalettePickerProps = RequiredProps;

export type ClearableComponentProps = {
  palettes: Array<ColorPalette | CustomColorPalette>;
} & Partial<Pick<ClearableProps, 'onChange' | 'palette'>> &
  Pick<ClearableProps, 'id'>;

export type RequiredComponentProps = {
  palettes: Array<ColorPalette | CustomColorPalette>;
} & Partial<Pick<RequiredProps, 'onChange' | 'palette' | 'id'>>;

export interface ColorStop {
  color: string;
  stop: number;
}
