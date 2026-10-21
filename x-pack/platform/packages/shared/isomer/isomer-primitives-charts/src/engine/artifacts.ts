/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeWalker, Composition, PrimitiveNode } from '@elastic/isomer-sdk';

import { chartDistillery } from '../theme/distillery';
import { type ColorMode, resolveChartTheme } from '../theme/resolve';

import type { ChartArtifact, ChartEngine, ChartNode, ChartType } from './types';

const { figure } = chartDistillery.resolveValues('light');
const DEFAULT_HEIGHT = parseFloat(figure.height);

/** Object keys sorted, so equal content gives an equal string whatever its key order. */
const stableStringify = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(stableStringify).join(',')}]`
    : value !== null && typeof value === 'object'
    ? `{${Object.keys(value)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`
        )
        .join(',')}}`
    : JSON.stringify(value) ?? 'null';

/**
 * What identifies a drawing: the node's content, the mode, and the engine. Ids are content, not keys:
 * they are optional, and the surfaces render a validated copy, never the caller's object.
 */
const artifactKey = (engine: ChartEngine, node: PrimitiveNode, mode: ColorMode): string =>
  `${engine.id}@${engine.version}|${mode}|${stableStringify(node)}`;

interface Held {
  drawing: Promise<ChartArtifact | undefined>;
  artifact?: ChartArtifact;
  holds: number;
}

const stores = new WeakMap<ChartEngine, Map<string, Held>>();

const storeOf = (engine: ChartEngine): Map<string, Held> => {
  let store = stores.get(engine);
  if (!store) {
    store = new Map();
    stores.set(engine, store);
  }
  return store;
};

/** The drawing {@link prepareCharts} made for `node`, if it is still held. */
export const readArtifact = (
  engine: ChartEngine,
  node: PrimitiveNode,
  mode: ColorMode
): ChartArtifact | undefined => stores.get(engine)?.get(artifactKey(engine, node, mode))?.artifact;

export interface PrepareChartsOptions {
  /** Finds charts inside any pack's containers: `createChildNodeWalker(runtime.primitives)`. */
  walk: ChildNodeWalker;
  mode: ColorMode;
  /** The width every chart is drawn at; no surface tells a chart its own. */
  width: number;
  height?: number;
}

export interface PreparedCharts {
  /** Ends this call's hold on its drawings; call after the surface render. */
  release: () => void;
}

const isChart = (engine: ChartEngine, node: unknown): node is ChartNode =>
  node !== null &&
  typeof node === 'object' &&
  Object.hasOwn(engine.supports, (node as { type?: unknown }).type as ChartType);

/** Draws every chart in `composition` the engine supports, ahead of a static surface render. */
export const prepareCharts = async (
  engine: ChartEngine,
  composition: Composition,
  { walk, mode, width, height = DEFAULT_HEIGHT }: PrepareChartsOptions
): Promise<PreparedCharts> => {
  const { draw } = engine;
  const store = storeOf(engine);
  const held: string[] = [];
  if (draw) {
    const theme = resolveChartTheme(mode);
    const queue: unknown[] = [...composition.body];
    for (let index = 0; index < queue.length; index += 1) {
      const node = queue[index];
      queue.push(...walk(node).map(({ node: child }) => child));
      if (!isChart(engine, node)) {
        continue;
      }
      const key = artifactKey(engine, node, mode);
      const existing = store.get(key);
      if (existing) {
        existing.holds += 1;
      } else {
        // Held before the draw resolves, so a concurrent call shares it rather than drawing again.
        const entry: Held = {
          drawing: Promise.resolve()
            .then(() => draw(node, { mode, theme, width, height }))
            .then(
              (artifact) => (entry.artifact = artifact),
              // A drawing that fails leaves the chart to its fallback table.
              () => undefined
            ),
          holds: 1,
        };
        store.set(key, entry);
      }
      held.push(key);
    }
    await Promise.all(
      held.flatMap((key) => {
        const entry = store.get(key);
        return entry ? [entry.drawing] : [];
      })
    );
  }
  return {
    release: () => {
      for (const key of held.splice(0)) {
        const entry = store.get(key);
        if (entry && --entry.holds === 0) {
          store.delete(key);
        }
      }
    },
  };
};
