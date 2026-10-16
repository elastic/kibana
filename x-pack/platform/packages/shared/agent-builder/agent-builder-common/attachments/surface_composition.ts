/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';

/** A block of GitHub-flavored markdown in a {@link SurfaceComposition}. */
export interface MarkdownNode extends PrimitiveNode {
  type: 'markdown';
  text: string;
}

/** The node types of a {@link SurfaceComposition}, the ones Agent Builder's Isomer pack renders. */
export type SurfaceNode = MarkdownNode;

/**
 * An [Isomer](https://github.com/elastic/isomer) composition built from Agent Builder's node
 * types: the same document renders to every surface, such as Slack or the browser. What an
 * attachment type's `toSurfaceComposition` returns, and what a response message becomes.
 */
export type SurfaceComposition = Composition<SurfaceNode>;
