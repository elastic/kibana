/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { Composition } from '@kbn/isomer';
import { createKibanaIsomerRuntime, type KibanaIsomerRuntime } from '@kbn/isomer';
import {
  type ChartHints,
  defineElasticChartsEngine,
  kibanaBaseTheme,
} from '@kbn/isomer-charts-elastic';
import { type ChartNode, defineChartsPack, resolveChartTheme } from '@kbn/isomer-primitives-charts';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

interface BenchPanel {
  id: string;
  node: ChartNode;
  width: number;
  height: number;
}

/** `panels` mounts each node's live chart at its reference size; `composition` renders the whole composition. */
export type Bench =
  | { mode: 'panels'; panels: BenchPanel[]; hints: ChartHints }
  | { mode: 'composition'; composition: Composition; hints: ChartHints };

interface BenchResult {
  states: Record<string, 'drawn' | 'unsupported'>;
  complete: boolean;
}

declare global {
  interface Window {
    isomerChartsBench?: (bench: Bench) => Promise<BenchResult>;
    isomerChartsThemeDiff?: () => string[];
  }
}

const renderedCount = () =>
  document.querySelectorAll('.echChartStatus[data-ech-render-complete="true"]').length;

const waitForCharts = async (expected: number) => {
  const started = performance.now();
  while (renderedCount() < expected && performance.now() - started < 10_000) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return renderedCount() >= expected;
};

/**
 * Elastic Charts measures text on a canvas when it lays out, so a face no DOM text has used yet measures as its
 * fallback. Kibana loads `Elastic UI Numeric` and Inter's heavier weights only on first use.
 */
const loadChartFonts = () =>
  Promise.all(
    [
      "400 12px 'Elastic UI Numeric'",
      '400 12px Inter',
      '500 12px Inter',
      '600 12px Inter',
      '700 12px Inter',
    ].map((font) => document.fonts.load(font, '0123456789%.,-+ Aa'))
  );

/**
 * The charts pack ships no stylesheet a React host can mount; its react renderer uses the same readable class
 * names the html surface styles, so the bench borrows that surface's CSS.
 */
const packStylesheet = (runtime: KibanaIsomerRuntime, composition: Composition) =>
  [...runtime.surfaces.html.render(composition).html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
    .map(([, css]) => css)
    .join('\n');

/** Paths where two values differ, e.g. `axes.tickLabel.fontFamily`. */
const differences = (a: unknown, b: unknown, path = ''): string[] => {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((key) =>
      differences(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key
      )
    );
  }
  return Object.is(a, b) ? [] : [`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`];
};

const ChartsBench = ({ charts }: { charts: ChartsPluginStart }) => {
  // Kibana's charts service theme, which the engine replicates as `kibanaBaseTheme`.
  const chartsBaseTheme = charts.theme.useChartsBaseTheme();
  useEffect(() => {
    window.isomerChartsThemeDiff = () => differences(chartsBaseTheme, kibanaBaseTheme('light'));
    return () => {
      delete window.isomerChartsThemeDiff;
    };
  }, [chartsBaseTheme]);
  const [bench, setBench] = useState<Bench>();
  const engine = useMemo(() => defineElasticChartsEngine({ hints: bench?.hints ?? {} }), [bench]);
  const theme = useMemo(() => resolveChartTheme('light'), []);
  const runtime = useMemo(
    () => createKibanaIsomerRuntime({ packs: [defineChartsPack(engine, { render: 'live' })] }),
    [engine]
  );

  useEffect(() => {
    window.isomerChartsBench = async (next) => {
      const nodes =
        next.mode === 'panels'
          ? next.panels.map(({ node }) => node)
          : (next.composition.body as ChartNode[]);
      const live = defineElasticChartsEngine({ hints: next.hints }).live ?? {};
      const states = Object.fromEntries(
        nodes.map(
          (node, index) =>
            [node.id ?? `panel-${index}`, live[node.type] ? 'drawn' : 'unsupported'] as const
        )
      );
      await loadChartFonts();
      setBench(next);
      const drawn = Object.values(states).filter((state) => state === 'drawn').length;
      return { states, complete: await waitForCharts(drawn) };
    };
    return () => {
      delete window.isomerChartsBench;
    };
  }, []);

  if (!bench) {
    return null;
  }
  if (bench.mode === 'composition') {
    return (
      <div data-test-subj="isomerChartsBenchComposition" style={{ width: 1200, padding: 16 }}>
        <style>{packStylesheet(runtime, bench.composition)}</style>
        {/* A live chart fills its container, which the host sizes, as a dashboard cell would. */}
        <style>{`[data-chart-state='live'] > .figure-drawing { height: 320px; }`}</style>
        {runtime.surfaces.react.render(bench.composition, { wrapper: true })}
      </div>
    );
  }
  return (
    <div data-test-subj="isomerChartsBenchPanels">
      {bench.panels.map(({ id, node, width, height }) => {
        const Live = engine.live?.[node.type] as
          | React.ComponentType<Record<string, unknown>>
          | undefined;
        return (
          <section
            key={id}
            id={`panel-${id}`}
            style={{ width, height, margin: 8, display: 'inline-block', verticalAlign: 'top' }}
          >
            {Live ? <Live {...{ node, theme, width, height }} /> : null}
          </section>
        );
      })}
    </div>
  );
};

export const renderChartsBench = (
  core: CoreStart,
  charts: ChartsPluginStart,
  element: HTMLElement
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <ChartsBench charts={charts} />
    </KibanaRenderContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
