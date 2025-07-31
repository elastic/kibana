/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getColorPalette, getLinearGradient } from '../../../color_palettes';

interface Props {
  colorPaletteId: string;
}

const componentStyles = {
  mapColorGradientStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      height: euiTheme.size.xs,
      position: 'relative',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    }),
};
export const ColorGradient = ({ colorPaletteId }: Props) => {
  const palette = getColorPalette(colorPaletteId);
  const styles = useMemoCss(componentStyles);
  return palette.length ? (
    <div css={styles.mapColorGradientStyles} style={{ background: getLinearGradient(palette) }} />
  ) : null;
};
