/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle, StylesCollector } from '@elastic/distillate';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { HTMLStyleAdapter } from '@elastic/isomer-sdk/html';
import { ISOMER_ROOT_CLASS, isomerDistillery } from './distillery';

/** The `styleCollector` tag of packs whose styles are collected by {@link isomerStyleAdapter}. */
export const ISOMER_STYLE_COLLECTOR = 'distillate';

/** Lets `light-dark()` follow the wrapper's `data-theme`, and the page's color scheme without one. */
const COLOR_SCHEME_CSS = [
  `.${ISOMER_ROOT_CLASS}{color-scheme:light dark}`,
  `.${ISOMER_ROOT_CLASS}[data-theme='light']{color-scheme:light}`,
  `.${ISOMER_ROOT_CLASS}[data-theme='dark']{color-scheme:dark}`,
].join('');

const { artifactCollector, environment, registry, renderStyles } = isomerDistillery;

/** HTML style adapter that records the Distillate handles a render uses and emits their stylesheet. */
export const isomerStyleAdapter: HTMLStyleAdapter<PrimitiveNode, StylesCollector> = {
  styleCollector: ISOMER_STYLE_COLLECTOR,
  // Compact names depend on the complete collected set, which doesn't exist until the markup is written.
  createCollector: () => artifactCollector('readable'),
  createRenderContext: (collector) => ({
    resolveClassName: (...handles) => {
      // Primitives pass Distillate handles, which the SDK types as its narrower `StyleHandle`.
      collector.useHandles(handles as unknown as readonly StyleHandle[]);
      return handles.map(({ readableName }) => readableName).join(' ');
    },
  }),
  renderStyles: (collector, { scheme }) => {
    if (!scheme) {
      return COLOR_SCHEME_CSS + renderStyles(collector);
    }

    // Image backends evaluate no `light-dark()`, so a requested scheme resolves to literal values.
    const themeValueOverrides = Object.fromEntries(
      Object.entries(environment.themeVars).map(([path, values]) => [path, values[scheme]])
    );
    return renderStyles(collector, undefined, { themeValueOverrides });
  },
  ownsHandle: (handle) => {
    const { moduleName } = handle as Partial<StyleHandle>;
    return registry.module(moduleName ?? '') !== undefined;
  },
};
