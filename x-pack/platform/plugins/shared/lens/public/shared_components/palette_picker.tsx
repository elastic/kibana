/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import { getActivePaletteName } from '@kbn/coloring';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getAppendedTag } from '@kbn/palettes';

interface PalettePickerProps<T> {
  palettes: PaletteRegistry;
  activePalette?: PaletteOutput<T>;
  setPalette: (palette: PaletteOutput) => void;
}

export function PalettePicker<T>({ palettes, activePalette, setPalette }: PalettePickerProps<T>) {
  const paletteName = getActivePaletteName(activePalette?.name);
  const palettesToShow: EuiColorPalettePickerPaletteProps[] = palettes
    .getAll()
    .filter(({ internal }) => !internal)
    .map(({ id, title, tag, getCategoricalColors }) => {
      return {
        value: id,
        title,
        append: getAppendedTag(tag),
        type: 'fixed',
        palette: getCategoricalColors(10, id === paletteName ? activePalette?.params : undefined),
      };
    });

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.lens.palettePicker.label', {
        defaultMessage: 'Palette',
      })}
    >
      <EuiColorPalettePicker
        fullWidth
        data-test-subj="lns-palettePicker"
        palettes={palettesToShow}
        onChange={(newPalette) => {
          setPalette({
            type: 'palette',
            name: newPalette,
          });
        }}
        valueOfSelected={paletteName}
        selectionDisplay={'palette'}
      />
    </EuiFormRow>
  );
}
