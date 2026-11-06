/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import type { DebugState } from '@elastic/charts';
import type { ElasticChartsNodeRenderer } from '@elastic/isomer-charts-elastic-node';
import { createElasticChartsNodeRenderer } from '@elastic/isomer-charts-elastic-node';
import { REPO_ROOT } from '@kbn/repo-info';
import { JSDOM } from 'jsdom';
import type { MetricReading } from './corpus';
import type { EngineOutput, GateAEngine } from './run';

/** Kibana's own UI font, which Elastic Charts measures and draws text in. */
const KIBANA_FONTS = ['Regular', 'Medium', 'SemiBold', 'Bold'].map((weight) => ({
  family: 'Inter',
  path: Path.resolve(
    REPO_ROOT,
    `src/core/packages/apps/server-internal/assets/fonts/inter/Inter-${weight}.woff2`
  ),
}));

const hasOwnText = (element: Element): boolean =>
  Array.from(element.childNodes).some(
    (node) => node.nodeType === 3 && (node.textContent ?? '').trim() !== ''
  );

const descendants = (root: Element): Element[] =>
  Array.from(root.children).flatMap((child) => [child, ...descendants(child)]);

const inlineStyle = (element: Element | null, property: 'color' | 'backgroundColor'): string => {
  for (let current = element; current; current = current.parentElement) {
    const value = (current as HTMLElement).style?.[property];
    if (value) {
      return value;
    }
    if (property === 'backgroundColor') {
      return '';
    }
  }
  return '';
};

/**
 * The metric tiles in an engine's markup, read as the corpus capture reads them from Kibana's
 * page: each `.echMetric`'s background and the elements carrying their own text, in DOM order.
 * Colors come from inline styles, a text's from its nearest ancestor that sets one, which is
 * where Elastic Charts' metric puts them. The tree is walked by hand: jsdom's selector engine
 * compiles selectors with `new Function`, which Kibana forbids.
 */
export const readMetricMarkup = (html: string): MetricReading[] => {
  const { window } = new JSDOM(`<!doctype html><body>${html}</body>`);
  try {
    const read = (element: Element) => {
      return {
        text: (element.textContent ?? '').trim(),
        className: typeof element.className === 'string' ? element.className : '',
        color: inlineStyle(element, 'color'),
        backgroundColor: inlineStyle(element, 'backgroundColor'),
      };
    };
    return descendants(window.document.body)
      .filter((element) => element.classList.contains('echMetric'))
      .map((metric) => {
        return {
          backgroundColor: read(metric).backgroundColor,
          texts: descendants(metric)
            .filter(hasOwnText)
            .map(read)
            .map(({ text, className, color }) => ({ text, className, color })),
        };
      });
  } finally {
    window.close();
  }
};

/** Gate A's engine: `elastic-charts-node` on a worker thread, in Kibana's font. */
export const createElasticChartsNodeEngine = async (): Promise<
  GateAEngine & { close: () => Promise<void> }
> => {
  const renderer: ElasticChartsNodeRenderer = await createElasticChartsNodeRenderer({
    fonts: KIBANA_FONTS,
  });
  return {
    draw: async (scene, { width, height }): Promise<EngineOutput> => {
      const drawing = await renderer.draw(scene, { width, height, debugState: true });
      if (scene.kind === 'metric') {
        return { kind: 'metric', readings: readMetricMarkup(drawing.html) };
      }
      if (!drawing.debugState) {
        throw new Error('elastic-charts-node reported no DebugState for an xy chart.');
      }
      return { kind: 'xy', debugState: drawing.debugState as DebugState };
    },
    close: () => renderer.close(),
  };
};
