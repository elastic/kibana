/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOMClient from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { ReactElement } from 'react';
import { createHeadlessDomEnvironment, setExplicitSize } from './headless_dom_environment';

export interface RenderToPngResult {
  png: Buffer;
}

/**
 * Mounts a React element containing an Elastic Charts `<Chart>` in a headless DOM/canvas
 * environment and returns the chart's canvas rasterized to PNG. This is Spike A from the
 * package README: proof that Elastic Charts can draw without a browser.
 *
 * `onRenderChange` on `<Settings>` is used to detect when the chart has finished its (now
 * synchronous) draw pass; callers must pass a `<Settings onRenderChange={...} />` sibling
 * and the `rendered` flag set by it, or this will return whatever the canvas holds after
 * `maxAnimationFrames` flush passes.
 */
export const renderElasticChartsToPng = ({
  element,
  width,
  height,
  isRendered,
  maxAnimationFrames = 200,
}: {
  element: ReactElement;
  width: number;
  height: number;
  isRendered: () => boolean;
  maxAnimationFrames?: number;
}): RenderToPngResult => {
  const env = createHeadlessDomEnvironment();
  try {
    const root = env.document.createElement('div');
    setExplicitSize(root, { width, height });
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    env.document.body.appendChild(root);

    // React 18's `createRoot` is required here: the legacy `ReactDOM.render` API defers
    // `useLayoutEffect`-driven work (which is how Elastic Charts' `ResizeObserver` and
    // redux-connected resizer schedule the first draw) in a way that never flushes
    // synchronously in this headless environment. `flushSync` plus a manual
    // `requestAnimationFrame` pump (see `headless_dom_environment.ts`) is what gets a
    // fully drawn canvas out of a single synchronous call.
    const reactRoot = ReactDOMClient.createRoot(root);
    flushSync(() => reactRoot.render(element));
    env.flushAnimationFrames(maxAnimationFrames);
    if (!isRendered()) {
      // A second commit covers charts that need one more pass after their initial
      // ResizeObserver-driven layout (e.g. series store re-computation).
      flushSync(() => reactRoot.render(element));
      env.flushAnimationFrames(maxAnimationFrames);
    }

    // `getElementsByTagName` is a plain tag-name lookup; it does not go through jsdom's
    // `nwsapi`-backed CSS selector engine the way `querySelector(All)` does, so it stays
    // safe under `--disallow-code-generation-from-strings`. Prefer it over `querySelector`
    // anywhere in this package that walks a mounted subtree.
    const canvases = root.getElementsByTagName('canvas');
    if (canvases.length === 0) {
      throw new Error('Elastic Charts did not mount a <canvas> element');
    }

    // Elastic Charts can render multiple stacked canvases (e.g. a background layer); the
    // largest one backed by a real skia canvas is the one carrying the chart.
    let backing;
    for (let i = 0; i < canvases.length; i++) {
      const candidate = env.getBackingCanvas(canvases[i]);
      if (
        candidate &&
        (!backing || candidate.width * candidate.height > backing.width * backing.height)
      ) {
        backing = candidate;
      }
    }
    if (!backing) {
      throw new Error('No backing skia canvas found for the mounted <canvas> element(s)');
    }

    return { png: backing.toBuffer('image/png') };
  } finally {
    env.dispose();
  }
};

/** Builds the reference line chart used by the package's Spike A test and CLI smoke check. */
export const buildSampleLineChartElement = ({
  width,
  height,
  onRenderChange,
}: {
  width: number;
  height: number;
  onRenderChange: (rendered: boolean) => void;
}): ReactElement => {
  // Imported lazily to keep this module importable outside the headless environment too
  // (e.g. from the export type on the main server thread, for type checking).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Chart, Settings, LineSeries, ScaleType } = require('@elastic/charts');
  return React.createElement(
    Chart,
    { size: { width, height } },
    React.createElement(Settings, { onRenderChange }),
    React.createElement(LineSeries, {
      id: 'line1',
      xScaleType: ScaleType.Linear,
      yScaleType: ScaleType.Linear,
      xAccessor: 0,
      yAccessors: [1],
      data: [
        [0, 1],
        [1, 2],
        [2, 5],
        [3, 3],
      ],
    })
  );
};
