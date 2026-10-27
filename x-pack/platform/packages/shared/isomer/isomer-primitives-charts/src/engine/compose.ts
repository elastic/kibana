/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartComponents, ChartEngine, ChartSupport, ChartType } from './types';

const rank = ({ fidelity }: ChartSupport): number => (fidelity === 'native' ? 0 : 1);

/** Each type from the first engine that draws it natively, else the first that approximates it. */
export const composeEngines = (...engines: readonly ChartEngine[]): ChartEngine => {
  const owner = new Map<ChartType, ChartEngine>();
  for (const engine of engines) {
    for (const [type, support] of Object.entries(engine.supports) as [ChartType, ChartSupport][]) {
      const current = owner.get(type);
      if (!current || rank(support) < rank(current.supports[type]!)) {
        owner.set(type, engine);
      }
    }
  }
  const pick = (components: (engine: ChartEngine) => ChartComponents | undefined) =>
    Object.fromEntries(
      [...owner].flatMap(([type, engine]) => {
        const component = components(engine)?.[type];
        return component ? [[type, component]] : [];
      })
    ) as ChartComponents;
  return {
    id: engines.map(({ id }) => id).join('+'),
    version: engines.map(({ id, version }) => `${id}@${version}`).join('+'),
    supports: Object.fromEntries([...owner].map(([type, engine]) => [type, engine.supports[type]])),
    live: pick(({ live }) => live),
    reactNative: pick(({ reactNative }) => reactNative),
    draw: (node, request) => {
      const engine = owner.get(node.type);
      if (!engine?.draw) {
        throw new Error(`no engine draws ${node.type}`);
      }
      return engine.draw(node, request);
    },
  };
};
