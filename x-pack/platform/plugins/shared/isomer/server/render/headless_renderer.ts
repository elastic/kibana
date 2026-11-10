/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SceneEnvironment,
  SceneKind,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';
import type { ReactNode } from 'react';

type HeadlessModule = typeof import('@elastic/isomer-charts-elastic/headless');

// The kinds `createElasticChartsHeadlessRenderer` draws. The charts pack draws `table` and
// `legacyMetric` Scenes itself.
const HEADLESS_KINDS: ReadonlySet<SceneKind> = new Set<SceneKind>([
  'metric',
  'xy',
  'partition',
  'heatmap',
  'gauge',
  'tagCloud',
]);

/**
 * Headless Elastic Charts (`@elastic/isomer-charts-elastic/headless`) as a `SceneRenderer` that
 * loads the engine the first time it draws, not when the runtime is built, so a Kibana that
 * never draws a chart image never pays for it (about 48 MB of RSS). It runs on Node only and
 * draws a fixed-size SVG, which the `snapshot` surface carries to takumi.
 */
export const createLazyHeadlessRenderer = ({
  environments = ['node'],
  load = () =>
    // A synchronous require: a renderer draws synchronously, and the server runs CommonJS.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@elastic/isomer-charts-elastic/headless'),
}: {
  /**
   * Where it draws. Add `browser` only where the markup is static, such as the `snapshot`
   * surface, which a process with a global `document` (a test, say) detects as a browser.
   */
  environments?: readonly SceneEnvironment[];
  load?: () => HeadlessModule;
} = {}): SceneRenderer<ReactNode> & { readonly loaded: boolean } => {
  let engine: SceneRenderer<ReactNode> | undefined;
  return {
    id: 'elastic-charts-headless',
    environments,
    sized: true,
    supports: (kind) => HEADLESS_KINDS.has(kind),
    render: (scene, env) => {
      engine ??= load().createElasticChartsHeadlessRenderer({ environments });
      return engine.render(scene, env);
    },
    get loaded() {
      return engine !== undefined;
    },
  };
};
