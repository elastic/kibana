/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveCollectionOptions, StyleHandle, StyleSink } from '@elastic/distillate';
import { createDomSink } from '@elastic/distillate';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { isomerDistillery, isomerRenderOptions } from './distillery';
import { collectRootStyles } from './root_styles';

export type IsomerStyleContext = Required<Pick<StyledRenderContext, 'resolveClassName'>>;

/**
 * Either a caller-owned `sink`, with its own `render` and `warn`, or a `root` whose one shared
 * stylesheet always uses the default render options, so it takes neither.
 */
export type IsomerStyleContextOptions =
  | (LiveCollectionOptions & { sink: StyleSink; root?: never })
  | {
      /** Where the shared stylesheet goes. Defaults to the global `document`. */
      root?: Document | ShadowRoot;
      sink?: never;
      render?: never;
      warn?: never;
    };

const contextsByRoot = new WeakMap<Document | ShadowRoot, IsomerStyleContext>();

const liveContext = ({ render, ...options }: LiveCollectionOptions): IsomerStyleContext => {
  const { collector, resolveClassName } = isomerDistillery.liveCollection({
    ...options,
    render: { ...isomerRenderOptions(render?.scheme), ...render },
  });
  collectRootStyles(collector);
  return {
    // Primitives pass Distillate handles, which the SDK types as its narrower `StyleHandle`.
    resolveClassName: (...handles) => resolveClassName(...(handles as unknown as StyleHandle[])),
  };
};

const sinkFor = (root: Document | ShadowRoot) =>
  'head' in root
    ? createDomSink({ document: root })
    : createDomSink({ document: root.ownerDocument, parent: root });

/**
 * The render context for React renders of Isomer primitives: resolving a class name writes its
 * CSS, light and dark, to one `<style>` in `root`. Renders into the same root share it.
 */
export const createIsomerStyleContext = (
  options: IsomerStyleContextOptions = {}
): IsomerStyleContext => {
  if (options.sink) {
    return liveContext(options);
  }
  const target = options.root ?? document;
  const existing = contextsByRoot.get(target);
  if (existing) {
    return existing;
  }
  const context = liveContext({ sink: sinkFor(target) });
  contextsByRoot.set(target, context);
  return context;
};
