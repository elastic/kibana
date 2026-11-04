/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType, type SVGProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cache as emotionCache } from '@emotion/css';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { euiThemeVars } from '@kbn/ui-theme';
import { previewTextSvg } from './preview_font';

/**
 * Draws an EUI icon, the same SVG `EuiIcon` shows in the browser, as an SVG element of `size`
 * pixels with its top left corner at `x`, `y`.
 */
export const euiIconSvg = async (
  type: EuiIconType,
  { size, color, x, y }: { size: number; color: string; x: number; y: number }
): Promise<string> => {
  const { typeToPathMap } = await import('@elastic/eui/lib/components/icon/icon_map');
  const { icon } = await typeToPathMap[type]();
  // EUI icon components spread their props onto the root `<svg>`.
  const Icon = icon as ComponentType<SVGProps<SVGSVGElement>>;
  return renderToStaticMarkup(<Icon width={size} height={size} />).replace(
    /^<svg /,
    `<svg x="${x}" y="${y}" fill="${color}" `
  );
};

/**
 * Draws a `@kbn/chart-icons` icon (e.g. `IconChartHeatmap`) as `EuiIcon` shows it: scaled into a
 * `size` square at `x`, `y`, with the fills of its Emotion classes inlined.
 */
export const chartIconSvg = (
  Icon: ComponentType,
  { size, x, y }: { size: number; x: number; y: number }
): string =>
  renderToStaticMarkup(<Icon />)
    .replace(
      /^<svg width="\d+" height="\d+"/,
      `<svg x="${x}" y="${y}" width="${size}" height="${size}"`
    )
    .replace(/class="([^"]+)"/g, (attribute, className: string) => {
      const fill = /fill:\s*([^;]+);/.exec(emotionCache.registered[className] ?? '')?.[1];
      return fill ? `fill="${fill.trim()}"` : attribute;
    });

/**
 * Lens's `EmptyPlaceholder` as an SVG of `width` by `height`: the chart type's icon (`EuiIcon` size
 * `l`), an 8px spacer and the message in subdued 12px text on a 16px line, centered.
 */
export const emptyPlaceholderSvg = ({
  icon,
  message = 'No results found',
  width,
  height,
}: {
  icon: ComponentType;
  message?: string;
  width: number;
  height: number;
}): string => {
  const iconSize = 24;
  const top = (height - (iconSize + 8 + 16)) / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    chartIconSvg(icon, { size: iconSize, x: (width - iconSize) / 2, y: top }),
    previewTextSvg(message, {
      font: '400 12px Inter',
      x: width / 2,
      y: top + iconSize + 8 + 12.4,
      fill: euiThemeVars.euiTextSubduedColor,
      anchor: 'middle',
    }),
    '</svg>',
  ].join('');
};
