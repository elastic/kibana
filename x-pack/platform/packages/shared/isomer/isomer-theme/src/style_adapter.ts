/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle, StylesCollector } from '@elastic/distillate';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { HTMLStyleAdapter } from '@elastic/isomer-sdk/html';
import { isomerDistillery, isomerRenderOptions } from './distillery';
import { collectRootStyles } from './root_styles';

/** The `styleCollector` tag of packs whose styles are collected by {@link isomerStyleAdapter}. */
export const ISOMER_STYLE_COLLECTOR = 'distillate';

const { artifactCollector, registry, renderStyles } = isomerDistillery;

/** HTML style adapter that records the Distillate handles a render uses and emits their stylesheet. */
export const isomerStyleAdapter: HTMLStyleAdapter<PrimitiveNode, StylesCollector> = {
  styleCollector: ISOMER_STYLE_COLLECTOR,
  // Compact names depend on the complete collected set, which doesn't exist until the markup is written.
  createCollector: () => {
    const collector = artifactCollector('readable');
    collectRootStyles(collector);
    return collector;
  },
  createRenderContext: (collector) => ({
    resolveClassName: (...handles) => {
      // Primitives pass Distillate handles, which the SDK types as its narrower `StyleHandle`.
      collector.useHandles(handles as unknown as readonly StyleHandle[]);
      return handles.map(({ readableName }) => readableName).join(' ');
    },
  }),
  renderStyles: (collector, { scheme }) =>
    renderStyles(collector, undefined, isomerRenderOptions(scheme)),
  ownsHandle: (handle) => {
    const { moduleName } = handle as Partial<StyleHandle>;
    return registry.module(moduleName ?? '') !== undefined;
  },
};
