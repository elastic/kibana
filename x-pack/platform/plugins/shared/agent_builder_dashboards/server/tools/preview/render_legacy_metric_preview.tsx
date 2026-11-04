/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isColorDark } from '@elastic/eui';
import type { LegacyMetricState } from '@kbn/lens-common';
import { euiLightVars as euiThemeVars } from '@kbn/ui-theme';
import type { LegacyMetricConfig, LensApiConfig } from '@kbn/lens-embeddable-utils';
import { measurePreviewText, previewTextSvg } from './preview_font';
import { framePreviewSvg, PREVIEW_WIDTH } from './preview_frame';
import { euiIconSvg } from './preview_icons';
import { getDataSourceQuery, toRows } from './preview_table';
import type { PanelPreviewRenderer, PreviewTable } from './types';
import { getValueFormatter, type ValueFormat } from './value_format';
import {
  getColorByValueParams,
  getColorForValue,
  getLensVisualizationState,
} from './render_metric_preview';

type LegacyMetricSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

// The API schema has no ES|QL legacy metric yet (`legacyMetricConfigSchema` is data view only), so
// this is the shape of its ES|QL variant (`esqlLegacyMetricConfig`).
interface LegacyMetricConfigESQL {
  type: 'legacy_metric';
  title?: string;
  data_source: { type: 'esql'; query: string };
  metric: {
    column: string;
    label?: string;
    format?: ValueFormat;
    size?: LegacyMetricSize;
    labels?: { alignment?: 'top' | 'bottom' };
    values?: { alignment?: 'left' | 'center' | 'right' };
    apply_color_to?: 'background' | 'value';
    color?: LegacyMetricConfig['metric']['color'];
  };
}

const px = (size: string) => parseFloat(size);
// The EUI font sizes the Lens legacy metric `toExpression` sizes the label with.
const LABEL_FONT_SIZES: Record<LegacyMetricSize, number> = {
  xs: px(euiThemeVars.euiFontSizeXS),
  s: px(euiThemeVars.euiFontSizeS),
  m: px(euiThemeVars.euiFontSizeM),
  l: px(euiThemeVars.euiFontSizeL),
  xl: px(euiThemeVars.euiFontSizeXL),
  xxl: px(euiThemeVars.euiFontSizeXXL),
};
// `labelToMetricFontSizeMap` of the Lens legacy metric `toExpression`.
const VALUE_FONT_SIZES: Record<LegacyMetricSize, number> = {
  xs: LABEL_FONT_SIZES.xs * 2,
  s: LABEL_FONT_SIZES.m * 2.5,
  m: LABEL_FONT_SIZES.l * 2.5,
  l: LABEL_FONT_SIZES.xl * 2.5,
  xl: LABEL_FONT_SIZES.xxl * 2.5,
  xxl: LABEL_FONT_SIZES.xxl * 3,
};
const LINE_HEIGHT = 1.5;
// `euiTheme.size.base`, the padding of the metric container.
const PADDING = px(euiThemeVars.euiSize);
// The auto scale wrapper never shrinks the metric below this scale.
const MIN_SCALE = 0.3;
const TEXT_COLOR = euiThemeVars.euiTextColor;
const LIGHT_TEXT_COLOR = euiThemeVars.euiColorEmptyShade;
const CHART_HEIGHT = 200;
// Where the browser puts the alphabetic baseline below the middle of a line box, in em: half of
// Inter's ascender minus descender.
const BASELINE_BELOW_MIDDLE = 0.364;
// `VisualizationNoResults`: an `EuiEmptyPrompt` with a 32px icon and 12px text.
const EMPTY_ICON_SIZE = 32;
const EMPTY_GAP = 16;
const EMPTY_FONT_SIZE = 12;

// `getLegacyMetricDataBounds`: one value is colored across twice itself, more across their range.
const getDataBounds = (values: number[]) => {
  if (values.length === 1) {
    const [value] = values;
    if (value === 0) {
      return { min: -50, max: 100 };
    }
    return value < 0 ? { min: value * 2, max: 0 } : { min: 0, max: value * 2 };
  }
  return { min: Math.min(...values), max: Math.max(...values) };
};

// `parseRgbString` of the legacy metric: only `rgb()` colors have channels, anything else is NaN.
const parseRgbString = (color: string) => {
  const groups = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*?(,\s*(\d+)\s*)?\)/) ?? [];
  return {
    red: parseFloat(groups[1]),
    green: parseFloat(groups[2]),
    blue: parseFloat(groups[3]),
    opacity: groups[5] ? parseFloat(groups[5]) : undefined,
  };
};

// `needsLightText` of the legacy metric. A hex color has no channels to test, so it always gets
// the default dark text, like in the browser.
const needsLightText = (color: string) => {
  const { red, green, blue, opacity } = parseRgbString(color);
  return isColorDark(red, green, blue) && opacity !== 0;
};

// `shouldApplyColor`: a color with zero opacity colors nothing.
const shouldApplyColor = (color: string) => parseRgbString(color).opacity !== 0;

const renderNoResultsSvg = async () => {
  const lineHeight = EMPTY_FONT_SIZE * LINE_HEIGHT;
  const top = (CHART_HEIGHT - EMPTY_ICON_SIZE - EMPTY_GAP - lineHeight) / 2;
  const textTop = top + EMPTY_ICON_SIZE + EMPTY_GAP;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${CHART_HEIGHT}">`,
    await euiIconSvg('visualizeApp', {
      size: EMPTY_ICON_SIZE,
      color: TEXT_COLOR,
      x: (PREVIEW_WIDTH - EMPTY_ICON_SIZE) / 2,
      y: top,
    }),
    previewTextSvg('No results found', {
      font: `${EMPTY_FONT_SIZE}px Inter`,
      x: PREVIEW_WIDTH / 2,
      y: textTop + lineHeight / 2 + BASELINE_BELOW_MIDDLE * EMPTY_FONT_SIZE,
      fill: TEXT_COLOR,
      anchor: 'middle',
    }),
    '</svg>',
  ].join('');
};

/**
 * Draws a Lens legacy metric panel (ES|QL) as SVG, like the legacy metric renderer with the
 * options Lens passes: the value above or below its label, scaled down to fit the panel and
 * centered in it, with the value or the whole panel colored by value. Each row is a metric that
 * fills the panel, so the panel shows the first one and scrolls to the others.
 */
const renderLegacyMetricPreviewSvg = async (
  config: LegacyMetricConfigESQL,
  table: PreviewTable
): Promise<string> => {
  const { metric } = config;
  const rows = toRows(table);
  const [row] = rows;
  if (!row) {
    return framePreviewSvg(config.title, await renderNoResultsSvg(), CHART_HEIGHT);
  }

  // Lens's API transform handles the ES|QL variant even though `LensApiConfig` does not list it.
  const { palette, colorMode } = getLensVisualizationState<LegacyMetricState>(
    config as unknown as LensApiConfig
  );
  const size: LegacyMetricSize = metric.size ?? 'm';
  const labelFontSize = LABEL_FONT_SIZES[size];
  const valueFontSize = VALUE_FONT_SIZES[size];
  const rawValue = row[metric.column];
  const isNumeric = typeof rawValue === 'number';
  const label = metric.label ?? metric.column;
  const formattedValue = isNumeric ? getValueFormatter(metric.format)(rawValue) : String(rawValue);
  const color =
    palette && colorMode && colorMode !== 'None' && isNumeric
      ? getColorForValue(
          rawValue,
          getColorByValueParams(palette),
          getDataBounds(rows.map((current) => Number(current[metric.column])))
        )
      : undefined;
  const shouldBrush = shouldApplyColor(color ?? '');
  const background = shouldBrush && colorMode === 'Background' ? color : undefined;
  const valueColor = shouldBrush && colorMode === 'Labels' ? color : undefined;
  const textColor = background && needsLightText(background) ? LIGHT_TEXT_COLOR : TEXT_COLOR;

  // The metric is as wide as its widest line plus padding, and scaled down when it does not fit.
  const valueFont = `600 ${valueFontSize}px Inter`;
  const labelFont = `${labelFontSize}px Inter`;
  const valueWidth = measurePreviewText(formattedValue, valueFont);
  const labelWidth = measurePreviewText(label, labelFont);
  const textWidth = Math.max(valueWidth, labelWidth);
  const contentWidth = textWidth + 2 * PADDING;
  const valueLineHeight = valueFontSize * LINE_HEIGHT;
  const labelLineHeight = labelFontSize * LINE_HEIGHT;
  const contentHeight = valueLineHeight + labelLineHeight + 2 * PADDING;
  const scale = Math.max(
    Math.min(1, PREVIEW_WIDTH / contentWidth, CHART_HEIGHT / contentHeight),
    MIN_SCALE
  );
  const isLabelOnTop = (metric.labels?.alignment ?? 'top') === 'top';
  const align = metric.values?.alignment ?? 'left';
  const contentX = (PREVIEW_WIDTH - contentWidth * scale) / 2;
  const contentY = (CHART_HEIGHT - contentHeight * scale) / 2;
  const lineTops = isLabelOnTop
    ? { label: PADDING, value: PADDING + labelLineHeight }
    : { value: PADDING, label: PADDING + valueLineHeight };
  const line = (text: string, font: string, top: number, lineHeight: number, fill: string) => {
    const fontSize = lineHeight / LINE_HEIGHT;
    const width = measurePreviewText(text, font);
    const x =
      PADDING +
      (align === 'left' ? 0 : align === 'right' ? textWidth - width : (textWidth - width) / 2);
    return previewTextSvg(text, {
      font,
      x,
      y: top + lineHeight / 2 + BASELINE_BELOW_MIDDLE * fontSize,
      fill,
    });
  };

  const chartSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${CHART_HEIGHT}">`,
    background
      ? `<rect width="${PREVIEW_WIDTH}" height="${CHART_HEIGHT}" fill="${background}"/>`
      : '',
    `<g transform="translate(${contentX} ${contentY}) scale(${scale})">`,
    line(formattedValue, valueFont, lineTops.value, valueLineHeight, valueColor ?? textColor),
    line(label, labelFont, lineTops.label, labelLineHeight, textColor),
    '</g>',
    '</svg>',
  ].join('');
  return framePreviewSvg(config.title, chartSvg, CHART_HEIGHT);
};

export const legacyMetricPreviewRenderer: PanelPreviewRenderer<LegacyMetricConfigESQL> = {
  getQuery: getDataSourceQuery,
  renderSvg: renderLegacyMetricPreviewSvg,
};
