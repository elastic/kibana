/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { Wordcloud } from '@elastic/charts';
import type { WordModel } from '@elastic/charts';
import { collectSpecs, renderChart, SvgCanvas } from '@elastic/charts/dist/headless';
import { getActivePaletteName, getColorFactory, getValueKey } from '@kbn/coloring';
import type { PaletteOutput } from '@kbn/coloring';
import type { LensTagCloudState } from '@kbn/lens-common';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { TagcloudConfigESQL } from '@kbn/lens-embeddable-utils';
import type { RawValue } from '@kbn/data-plugin/common';
import { IconChartTagcloud } from '@kbn/chart-icons';
import { euiThemeVars } from '@kbn/ui-theme';
import { framePreviewSvg, PREVIEW_CHART_HEIGHT, PREVIEW_WIDTH } from './preview_frame';
import { getPreviewFont, previewTextSvg } from './preview_font';
import { emptyPlaceholderSvg, euiIconSvg } from './preview_icons';
import { getPreviewPalettes } from './preview_palettes';
import { DATE_TYPES, getDataSourceQuery, NUMBER_TYPES, toRows } from './preview_table';
import type { PanelPreviewRenderer, PreviewContext, PreviewTable } from './types';
import { getValueFormatter } from './value_format';

type TagCloudPreviewConfig = TagcloudConfigESQL;
type TagColorFn = (tag: unknown) => string;

// The tag cloud expression's `Orientation` presets (`ORIENTATIONS` in `TagCloudChart`), keyed by
// the Lens API orientation they come from.
const ORIENTATIONS = {
  horizontal: { endAngle: 0, angleCount: 360 },
  vertical: { endAngle: 90, angleCount: 2 },
  angled: { endAngle: -90, angleCount: 12 },
} as const;
const MAX_TAG_COUNT = 200;
// The legacy palettes of the charts plugin's palette service (`buildPalettes`): round robin
// through a categorical palette, or spread a gradient palette over the tags.
const LEGACY_CATEGORICAL_PALETTES: ReadonlySet<string> = new Set([
  'default',
  'elastic_line_optimized',
  'kibana_palette',
]);
const LEGACY_GRADIENT_PALETTES: Readonly<Record<string, string>> = {
  status: 'status',
  temperature: 'temperature',
  complementary: 'complementary',
  negative: 'red',
  positive: 'green',
  cool: 'cool',
  warm: 'warm',
  gray: 'gray',
};
// The caption is bold paragraph text, then one 16px `warning` icon per warning, each on its own row.
const CAPTION_HEIGHT = 20;
const CAPTION_FONT = `${euiThemeVars.euiFontWeightBold} 14px Inter`;
const WARNING_SIZE = 16;

/**
 * Colors tags like the legacy palette `TagCloudChart` falls back to without a color mapping:
 * `getCategoricalColor` with the rank of the tag's first row and sync colors off.
 */
const getLegacyPaletteColorFn = (
  palette: PaletteOutput | undefined,
  tags: unknown[]
): TagColorFn => {
  const name = getActivePaletteName(palette?.name);
  const palettes = getPreviewPalettes();
  const categorical = LEGACY_CATEGORICAL_PALETTES.has(name);
  const gradient = LEGACY_GRADIENT_PALETTES[name];
  const colors = categorical
    ? palettes.get(name).colors()
    : gradient
    ? palettes.get(gradient).colors(tags.length)
    : // Custom palettes need stops the Lens API cannot set; unknown palettes draw no color.
      [];
  return (tag) => {
    const rank = tags.indexOf(tag);
    return (categorical ? colors[rank % colors.length] : colors[rank]) ?? 'rgba(0,0,0,0)';
  };
};

/**
 * Returns how Lens colors each tag: with the panel's color mapping (`getColorFactory` over the
 * tags in row order) when the Lens state has one, else with its legacy palette.
 */
const getTagColorFn = (config: TagCloudPreviewConfig, tags: unknown[]): TagColorFn => {
  const visualization = new LensConfigBuilder(undefined, true).fromAPIFormat(config).state
    .visualization as LensTagCloudState;
  const { colorMapping, palette } = visualization;
  if (!colorMapping) {
    return getLegacyPaletteColorFn(palette, tags);
  }
  const seen = new Set<string>();
  // `getColorCategories`: the distinct tags, in the order they first appear.
  const categories = tags.filter((tag) => {
    const key = getValueKey(tag as RawValue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as RawValue[];
  const getColor = getColorFactory(colorMapping, getPreviewPalettes(), false, {
    type: 'categories',
    categories,
  });
  return (tag) => getColor(tag as RawValue);
};

const renderEmptySvg = (title: string | undefined): string =>
  framePreviewSvg(
    title,
    emptyPlaceholderSvg({
      icon: IconChartTagcloud,
      width: PREVIEW_WIDTH,
      height: PREVIEW_CHART_HEIGHT,
    })
  );

/**
 * Draws a Lens tag cloud (ES|QL) like `TagCloudChart`: one word per row, sized linearly by the
 * metric between the min and max font sizes, colored by the tag's color mapping or legacy palette,
 * laid out by d3-cloud with Inter glyph shapes, with the caption and the warnings below.
 */
const renderTagCloudPreviewSvg = async (
  config: TagCloudPreviewConfig,
  table: PreviewTable,
  { timeZone, dateFormat }: PreviewContext
): Promise<string> => {
  const { metric, tag_by: tagBy, styling = {} } = config;
  const metricIndex = table.columns.findIndex(({ name }) => name === metric.column);
  const tagIndex = table.columns.findIndex(({ name }) => name === tagBy.column);
  if (metricIndex < 0 || tagIndex < 0) {
    throw new Error('The tag cloud has no metric and tag_by columns in its ES|QL result');
  }
  const rows = toRows(table);
  if (rows.length === 0) {
    return renderEmptySvg(config.title);
  }

  const metrics = rows.map((row) => Number(row[metric.column]));
  const minValue = Math.min(...metrics);
  const maxValue = Math.max(...metrics);
  // Raw ES|QL values, as Lens matches them against the color mapping.
  const tags = table.values.map((row) => row[tagIndex]);
  const tagType = table.columns[tagIndex]?.type ?? 'keyword';
  const formatNumber = getValueFormatter(tagBy.format);
  const formatTag = (tag: unknown): string => {
    if (tag === null || tag === undefined) return '(null)';
    if (DATE_TYPES.has(tagType)) return moment.tz(tag as string, timeZone).format(dateFormat);
    if (NUMBER_TYPES.has(tagType) && typeof tag === 'number') return formatNumber(tag);
    return String(tag);
  };
  const getTagColor = getTagColorFn(config, tags);
  const data: WordModel[] = tags.map((tag, index) => ({
    text: formatTag(tag),
    weight: rows.length <= 1 ? 1 : ((metrics[index] ?? 0) - minValue) / (maxValue - minValue) || 0,
    color: getTagColor(tag),
  }));

  const { endAngle, angleCount } = ORIENTATIONS[styling.orientation ?? 'horizontal'];
  const showCaption = styling.caption?.visible ?? true;
  const caption = `${tagBy.label ?? tagBy.column} - ${metric.label ?? metric.column}`;
  const tooManyTags = data.length > MAX_TAG_COUNT;

  const drawCloud = (chartHeight: number) => {
    let allWordsFit = true;
    const canvas = new SvgCanvas(PREVIEW_WIDTH, chartHeight, { font: getPreviewFont() });
    renderChart({
      specs: collectSpecs(
        <Wordcloud
          id="tagCloud"
          startAngle={0}
          endAngle={endAngle}
          angleCount={angleCount}
          padding={5}
          fontWeight={400}
          fontFamily="'Elastic UI Numeric', 'Inter UI', sans-serif"
          fontStyle="normal"
          minFontSize={styling.font_size?.min ?? 18}
          maxFontSize={styling.font_size?.max ?? 72}
          spiral="archimedean"
          data={data}
          // The Lens API has no scale option; the tag cloud expression defaults to linear.
          weightFn="linear"
          outOfRoomCallback={() => {
            allWordsFit = false;
          }}
        />
      ),
      width: PREVIEW_WIDTH,
      height: chartHeight,
      context: canvas.context,
      Path2D: canvas.Path2D,
    });
    return { svg: canvas.toSvg(), allWordsFit };
  };

  // The chart shrinks to make room for the caption and warnings below it. The "did not fit"
  // warning only shows up after a first layout, and then stays while the cloud is laid out again.
  const fixedHeight = (showCaption ? CAPTION_HEIGHT : 0) + (tooManyTags ? WARNING_SIZE : 0);
  const firstLayout = drawCloud(PREVIEW_CHART_HEIGHT - fixedHeight);
  const warnings = Number(tooManyTags) + Number(!firstLayout.allWordsFit);
  const chartHeight =
    PREVIEW_CHART_HEIGHT - fixedHeight - (firstLayout.allWordsFit ? 0 : WARNING_SIZE);
  const { svg } = firstLayout.allWordsFit ? firstLayout : drawCloud(chartHeight);

  const warningTop = chartHeight + (showCaption ? CAPTION_HEIGHT : 0);
  const warningIcons = await Promise.all(
    Array.from({ length: warnings }, (_, index) =>
      euiIconSvg('warning', {
        size: WARNING_SIZE,
        color: euiThemeVars.euiColorWarningText,
        x: 0,
        y: warningTop + index * WARNING_SIZE,
      })
    )
  );
  const captionSvg = showCaption
    ? previewTextSvg(caption, {
        font: CAPTION_FONT,
        x: PREVIEW_WIDTH / 2,
        y: chartHeight + 15,
        fill: euiThemeVars.euiTextColor,
        anchor: 'middle',
      })
    : '';
  return framePreviewSvg(
    config.title,
    [
      `<svg width="${PREVIEW_WIDTH}" height="${PREVIEW_CHART_HEIGHT}">`,
      svg,
      captionSvg,
      ...warningIcons,
      '</svg>',
    ].join('')
  );
};

export const tagCloudPreviewRenderer: PanelPreviewRenderer<TagCloudPreviewConfig> = {
  getQuery: getDataSourceQuery,
  renderSvg: renderTagCloudPreviewSvg,
};
