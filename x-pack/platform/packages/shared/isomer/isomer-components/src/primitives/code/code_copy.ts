/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancementDefinition } from '@elastic/isomer-sdk';
import { someBodyNode } from '@elastic/isomer-sdk';

/** The id a React host passes in `enhancements` to give each code block a Copy button. */
export const CODE_COPY_ENHANCEMENT = 'codeCopy';

const isCode = (node: unknown): boolean =>
  typeof node === 'object' && node !== null && (node as { type?: unknown }).type === 'code';

/**
 * Gives each `code` block a Copy button, in a React host with the clipboard API.
 *
 * Unlike the slides pack's `slideCopy`, it has no `script`: the SDK would compile one with
 * `new Function`, which Kibana's CSP and its server's `--disallow-code-generation-from-strings`
 * both refuse. The code's React renderer draws the button instead, once it has mounted and found
 * a clipboard, so static HTML never shows a button that can't work.
 */
export const codeCopyEnhancement: EnhancementDefinition = {
  id: CODE_COPY_ENHANCEMENT,
  name: 'Copy code',
  description: 'Adds a Copy button to each code block when the clipboard API is available.',
  appliesTo: (body, walk) => someBodyNode(body, 'react', isCode, walk),
};
