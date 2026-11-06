/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { View, parse } from 'vega';
import { compile } from 'vega-lite';
import { expressionInterpreter } from 'vega-interpreter';
import type { ParsedVegaSpec } from '../model/vega_spec';

export interface VegaTheme {
  text: string;
  line: string;
}

/** Theme colours that both Vega's and Vega-Lite's config accept. */
const getConfig = ({ text, line }: VegaTheme) => {
  const axis = {
    labelColor: text,
    titleColor: text,
    domainColor: line,
    tickColor: line,
    gridColor: line,
  };
  return {
    background: 'transparent',
    axis,
    legend: { labelColor: text, titleColor: text },
    title: { color: text, subtitleColor: text },
    style: { 'guide-label': { fill: text }, 'guide-title': { fill: text } },
  };
};

export interface VegaRender {
  resize: (width: number, height: number) => void;
  destroy: () => void;
}

/**
 * Renders the spec into the container, sized to it unless the spec sets its own size.
 * Expressions run through the interpreter, because Kibana's CSP forbids `eval`.
 */
export const renderVega = async (
  container: HTMLElement,
  parsed: ParsedVegaSpec,
  theme: VegaTheme
): Promise<VegaRender> => {
  const config = getConfig(theme);
  const isLite = parsed.language === 'vega-lite';
  const hasOwnSize = 'width' in parsed.spec || 'height' in parsed.spec;
  // Vega's default `pad` grows the view past its size to fit axes, overflowing the cell.
  const autosize = { type: 'fit', contains: 'padding' } as const;
  const spec = isLite
    ? compile({ width: 'container', height: 'container', autosize, ...parsed.spec }, { config })
        .spec
    : hasOwnSize
    ? parsed.spec
    : { autosize, ...parsed.spec };

  const view = new View(parse(spec, isLite ? undefined : config, { ast: true }), {
    expr: expressionInterpreter,
    renderer: 'svg',
    container,
    hover: true,
  });
  const fit = (width: number, height: number) => {
    if (hasOwnSize) return;
    view.width(width).height(height);
  };
  fit(container.clientWidth, container.clientHeight);
  try {
    await view.runAsync();
  } catch (error) {
    view.finalize();
    throw error;
  }
  return {
    resize: (width, height) => {
      fit(width, height);
      void view.resize().runAsync();
    },
    destroy: () => view.finalize(),
  };
};
