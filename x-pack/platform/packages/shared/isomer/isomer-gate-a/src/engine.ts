/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import { renderSceneSvg } from '@elastic/isomer-charts-elastic/headless';
import type { MetricReading } from './corpus';
import type { EngineOutput, GateAEngine } from './run';

const unescapeXml = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const RECT_PATH = /^M\s*[\d.-]+\s+[\d.-]+(?:\s*L\s*[\d.-]+\s+[\d.-]+){3}\s*Z$/;

const ELEMENT =
  /<clipPath id="([^"]+)"[^>]*><path d="([^"]+)"\/><\/clipPath>|<path d="([^"]+)" fill="([^"]+)" clip-path="url\(#([^)]+)\)"\/>|<text\b([^>]*)>([^<]*)<\/text>/g;

const attribute = (attributes: string, name: string): string | undefined =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attributes)?.[1];

/**
 * The metric tiles in headless Elastic Charts' SVG, read as the corpus capture reads them from
 * Kibana's page: each tile's background and its texts in drawing order. A tile starts at a filled
 * rectangle that fills its own clip, as Elastic Charts draws a metric panel's background. Texts
 * on one baseline in one color are one text, as Elastic Charts splits a value from its unit.
 */
export const readMetricSvg = (svg: string): MetricReading[] => {
  const clips = new Map<string, string>();
  const tiles: Array<{
    backgroundColor: string;
    texts: Array<{ text: string; color: string; y: string }>;
  }> = [];
  for (const [, clipId, clipPath, path, fill, pathClip, textAttributes, text] of svg.matchAll(
    ELEMENT
  )) {
    if (clipId) {
      clips.set(clipId, clipPath);
    } else if (path) {
      if (RECT_PATH.test(path) && clips.get(pathClip) === path) {
        tiles.push({ backgroundColor: fill, texts: [] });
      }
    } else if (textAttributes !== undefined && tiles.length > 0) {
      const color = attribute(textAttributes, 'fill') ?? '';
      const y = attribute(textAttributes, 'y') ?? '';
      const value = unescapeXml(text ?? '').trim();
      const texts = tiles[tiles.length - 1].texts;
      const previous = texts[texts.length - 1];
      if (!value) {
        continue;
      }
      if (previous && previous.y === y && previous.color === color) {
        previous.text += value;
      } else {
        texts.push({ text: value, color, y });
      }
    }
  }
  return tiles.map(({ backgroundColor, texts }) => ({
    backgroundColor,
    texts: texts.map(({ text, color }) => ({ text, className: '', color })),
  }));
};

/**
 * Gate A's engine: `@elastic/isomer-charts-elastic/headless`, Elastic Charts' headless SVG
 * renderer, as Kibana's server draws chart pictures. Text is laid out with Elastic Charts'
 * Helvetica metrics, so text geometry differs from the browser's within the tolerance.
 */
const TEXT = /<text\b([^>]*)>([^<]*)<\/text>/g;

/** The words a headless `Wordcloud` drew: each SVG text and its fill, in document order. */
export const readWordsSvg = (svg: string): Array<{ text: string; fill: string }> =>
  [...svg.matchAll(TEXT)].map(([, attributes, text]) => ({
    text: unescapeXml(text).trim(),
    fill: attribute(attributes, 'fill') ?? '',
  }));

export const createElasticChartsHeadlessEngine = async (): Promise<
  GateAEngine & { close: () => Promise<void> }
> => ({
  draw: async (scene, { width, height }): Promise<EngineOutput> => {
    if (scene.kind === 'table' || scene.kind === 'legacyMetric') {
      // The charts pack draws these itself, not through Elastic Charts.
      return { kind: 'none' };
    }
    const drawing = renderSceneSvg({ ...scene, size: { width, height } });
    if (scene.kind === 'metric') {
      return { kind: 'metric', readings: readMetricSvg(drawing.svg) };
    }
    if (scene.kind === 'tagCloud') {
      return { kind: 'words', texts: readWordsSvg(drawing.svg) };
    }
    if (!drawing.debugState) {
      throw new Error(`Headless Elastic Charts reported no DebugState for a ${scene.kind} chart.`);
    }
    return { kind: 'xy', debugState: drawing.debugState as DebugState };
  },
  close: async () => {},
});
