/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Distillery, StyleHandle, StylesCollector } from '@elastic/distillate';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { HTMLStyleAdapter } from '@elastic/isomer-sdk/html';

/** The `styleCollector` tag of a pack whose `collectStyles` hooks mutate a Distillate collector. */
export const DISTILLATE_STYLE_COLLECTOR = 'distillate';

type StyleEngine = Pick<
  Distillery,
  'artifactCollector' | 'environment' | 'registry' | 'renderStyles'
>;

/**
 * HTML style adapter for `distillery`: records handles during render and emits their stylesheet.
 *
 * Readable names only: compact names depend on the complete collected set, which does not exist until the markup naming them is written.
 */
export const createDistillateStyleAdapter = (
  distillery: StyleEngine
): HTMLStyleAdapter<PrimitiveNode, StylesCollector> => ({
  styleCollector: DISTILLATE_STYLE_COLLECTOR,
  createCollector: () => distillery.artifactCollector('readable'),
  createRenderContext: (collector) => ({
    resolveClassName: (...handles) => {
      // Renderers pass Distillate handles, typed by the SDK as its narrower `StyleHandle`.
      collector.useHandles(handles as unknown as readonly StyleHandle[]);
      return handles.map(({ readableName }) => readableName).join(' ');
    },
  }),
  renderStyles: (collector, { scheme }) => {
    if (!scheme) {
      return distillery.renderStyles(collector);
    }
    const themeValueOverrides = Object.fromEntries(
      Object.entries(distillery.environment.themeVars).map(([path, values]) => [
        path,
        values[scheme],
      ])
    );
    return distillery.renderStyles(collector, undefined, {
      themeValueOverrides,
    });
  },
  // Each distillery owns a private registry, and a handle names the module it was authored in.
  ownsHandle: (handle) => {
    const { moduleName } = handle as Partial<StyleHandle>;
    return distillery.registry.module(moduleName ?? '') !== undefined;
  },
});
