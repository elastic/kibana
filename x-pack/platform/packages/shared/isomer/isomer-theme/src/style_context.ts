/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveCollectionOptions, StyleHandle } from '@elastic/distillate';
import { createDomSink } from '@elastic/distillate';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { isomerDistillery, isomerRenderOptions } from './distillery';
import { collectRootStyles } from './root_styles';

export type IsomerStyleContext = Required<Pick<StyledRenderContext, 'resolveClassName'>>;

export interface IsomerStyleContextOptions extends LiveCollectionOptions {
  /** Where the stylesheet goes when no `sink` is given. Defaults to the global `document`. */
  root?: Document | ShadowRoot;
}

const contextsByRoot = new WeakMap<Document | ShadowRoot, IsomerStyleContext>();

const liveContext = (options: LiveCollectionOptions): IsomerStyleContext => {
  const { collector, resolveClassName } = isomerDistillery.liveCollection({
    ...options,
    render: { ...isomerRenderOptions(), ...options.render },
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
export const createIsomerStyleContext = ({
  root,
  ...options
}: IsomerStyleContextOptions = {}): IsomerStyleContext => {
  if (options.sink) {
    return liveContext(options);
  }
  const target = root ?? document;
  const existing = contextsByRoot.get(target);
  if (existing) {
    return existing;
  }
  const context = liveContext({ ...options, sink: sinkFor(target) });
  contextsByRoot.set(target, context);
  return context;
};
