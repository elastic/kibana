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

type CollectedEntry = StylesCollector['collectedEntries'][number];

/** An entry's identity: its registered key, and for a media block the inner rules it has gained. */
const entryIdentity = (entry: CollectedEntry): string =>
  entry.kind === 'media'
    ? `media/${entry.key}(${entry.rules.map(({ key }) => key).join('+')})`
    : entry.key;

/** How many distinct stylesheets stay cached; each is one combination of collected entries and scheme. */
const MAX_CACHED_SHEETS = 32;

/**
 * Stylesheets by scheme and collected entries. A stylesheet depends on nothing else: registered entries and the
 * theme's tokens don't change, so rendering it again for the same set gives the same CSS.
 */
const sheets = new Map<string, string>();

const cachedSheet = (key: string, render: () => string): string => {
  const cached = sheets.get(key);
  if (cached !== undefined) {
    // Most recently used last, so the oldest is evicted first.
    sheets.delete(key);
    sheets.set(key, cached);
    return cached;
  }
  const sheet = render();
  sheets.set(key, sheet);
  const [oldest] = sheets.keys();
  if (sheets.size > MAX_CACHED_SHEETS && oldest !== undefined) {
    sheets.delete(oldest);
  }
  return sheet;
};

/** Handles each collector has been given; giving it one again only repeats work it has done. */
const seenHandles = new WeakMap<StylesCollector, Set<string>>();

/** HTML style adapter that records the Distillate handles a render uses and emits their stylesheet. */
export const isomerStyleAdapter: HTMLStyleAdapter<PrimitiveNode, StylesCollector> = {
  styleCollector: ISOMER_STYLE_COLLECTOR,
  // Compact names depend on the complete collected set, which doesn't exist until the markup is written.
  createCollector: () => {
    const collector = artifactCollector('readable');
    collectRootStyles(collector);
    return collector;
  },
  createRenderContext: (collector) => {
    let seen = seenHandles.get(collector);
    if (!seen) {
      seen = new Set();
      seenHandles.set(collector, seen);
    }
    const known = seen;
    return {
      resolveClassName: (...handles) => {
        // Primitives pass Distillate handles, which the SDK types as its narrower `StyleHandle`.
        const unseen = (handles as unknown as readonly StyleHandle[]).filter(
          ({ key }) => !known.has(key)
        );
        if (unseen.length > 0) {
          collector.useHandles(unseen);
          unseen.forEach(({ key }) => known.add(key));
        }
        return handles.map(({ readableName }) => readableName).join(' ');
      },
    };
  },
  renderStyles: (collector, { scheme }) =>
    cachedSheet(`${scheme}|${collector.collectedEntries.map(entryIdentity).join(',')}`, () =>
      renderStyles(collector, undefined, isomerRenderOptions(scheme))
    ),
  ownsHandle: (handle) => {
    const { moduleName } = handle as Partial<StyleHandle>;
    return registry.module(moduleName ?? '') !== undefined;
  },
};
