/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { collectSpecs, renderChart, SvgCanvas } from '@elastic/charts/dist/headless';
import { escapeXml, getPreviewFont, previewTextSvg } from './preview_font';

export { escapeXml };

/** Width of every preview, in CSS pixels. */
export const PREVIEW_WIDTH = 720;
/** Height of the chart area below the title band, in CSS pixels. */
export const PREVIEW_CHART_HEIGHT = 360;
const TITLE_HEIGHT = 36;

/**
 * Wraps a chart SVG of `PREVIEW_WIDTH` by `chartHeight` into a preview: a white page with the
 * panel title above the chart.
 */
export const framePreviewSvg = (
  title: string | undefined,
  chartSvg: string,
  chartHeight: number = PREVIEW_CHART_HEIGHT
): string => {
  const chart = chartSvg.replace(/^<svg /, `<svg x="0" y="${TITLE_HEIGHT}" `);
  const height = chartHeight + TITLE_HEIGHT;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${height}" viewBox="0 0 ${PREVIEW_WIDTH} ${height}">`,
    `<rect width="${PREVIEW_WIDTH}" height="${height}" fill="#fff"/>`,
    previewTextSvg(title ?? '', { font: '600 15px Inter', x: 8, y: 24, fill: '#1d2a3e' }),
    chart,
    '</svg>',
  ].join('');
};

/** Draws Elastic Charts spec components with the headless renderer into a framed preview. */
export const renderChartPreviewSvg = (title: string | undefined, element: ReactNode): string => {
  const canvas = new SvgCanvas(PREVIEW_WIDTH, PREVIEW_CHART_HEIGHT, { font: getPreviewFont() });
  renderChart({
    specs: collectSpecs(element),
    width: PREVIEW_WIDTH,
    height: PREVIEW_CHART_HEIGHT,
    context: canvas.context,
    Path2D: canvas.Path2D,
  });
  return framePreviewSvg(title, canvas.toSvg());
};
