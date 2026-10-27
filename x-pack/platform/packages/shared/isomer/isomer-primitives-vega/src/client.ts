/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Loader, parse, renderModule, View } from 'vega';
import { Handler } from 'vega-tooltip';

import { expressionEvaluator } from './interpreter';
import { safeBackground, scrubScene } from './scene';
import { hardenVegaSpec, isSpecObject } from './spec';

const refuse = () => Promise.reject(new Error('vega: refused'));

/** Rejects every request, links included: a resolved empty href would navigate to the page itself. */
const clientLoader: Loader = {
  load: refuse,
  sanitize: refuse,
  http: refuse,
  file: refuse,
};

/** Only the DOM SVG renderer surface the scrubbing subclass touches. */
interface SvgRendererBase {
  _render(scene: unknown, markTypes: unknown): unknown;
  background(...color: unknown[]): unknown;
}

interface SvgModule {
  renderer: new (loader: Loader) => SvgRendererBase;
  headless: unknown;
  handler: unknown;
}

const SCRUBBED_SVG = 'isomer-scrubbed-svg';

/**
 * Registers, once, Vega's DOM SVG renderer with the server's scene scrub run
 * before every draw: signals and data re-set links and styles on each update.
 */
const registerScrubbedSvg = () => {
  // `vega-typings` declares only the two-argument registration form.
  const lookup = renderModule as unknown as (
    name: string,
    module?: SvgModule
  ) => SvgModule | undefined;
  if (lookup(SCRUBBED_SVG) !== undefined) {
    return;
  }
  const base = lookup('svg');
  if (base === undefined) {
    throw new Error('vega: the svg render module is not registered');
  }
  class ScrubbedSvgRenderer extends base.renderer {
    override _render(scene: unknown, markTypes: unknown) {
      scrubScene(scene);
      return super._render(scene, markTypes);
    }

    override background(...color: unknown[]) {
      return color.length === 0 ? super.background() : super.background(safeBackground(color[0]));
    }
  }
  lookup(SCRUBBED_SVG, { ...base, renderer: ScrubbedSvgRenderer });
};

export interface HydratedVega {
  views: readonly View[];
  /** Finalizes every view, removing its listeners and timers. */
  dispose: () => void;
}

const readSpec = (chart: Element) => {
  const source = chart.querySelector('script[data-isomer-vega-spec]')?.textContent;
  if (!source) {
    return undefined;
  }
  const spec: unknown = JSON.parse(source);
  return isSpecObject(spec) ? hardenVegaSpec(spec) : undefined;
};

/**
 * Replaces each server-rendered chart under `root` with a live Vega view, for
 * tooltips and signals. Needs the `vegaInteractive` enhancement on the render,
 * which embeds each chart's spec; a chart without one keeps its SVG.
 */
export const hydrateVega = async (root: ParentNode): Promise<HydratedVega> => {
  registerScrubbedSvg();
  const charts = Array.from(root.querySelectorAll('[data-isomer-vega]'));
  const views = await Promise.all(
    charts.flatMap((chart) => {
      const spec = readSpec(chart);
      const container = chart.querySelector('[data-isomer-vega-chart]');
      if (spec === undefined || !(container instanceof HTMLElement)) {
        return [];
      }
      const view = new View(parse(spec, undefined, { ast: true }), {
        // `vega-typings` lists only the built-in renderer names.
        renderer: SCRUBBED_SVG as 'svg',
        loader: clientLoader,
        expr: expressionEvaluator,
        hover: true,
      });
      view.tooltip(new Handler().call);
      container.replaceChildren();
      return [view.initialize(container).runAsync()];
    })
  );
  return {
    views,
    dispose: () => {
      for (const view of views) {
        view.finalize();
      }
    },
  };
};
