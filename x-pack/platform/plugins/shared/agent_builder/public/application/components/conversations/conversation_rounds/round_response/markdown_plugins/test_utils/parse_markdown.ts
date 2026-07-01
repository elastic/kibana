/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import remarkParse from 'remark-parse-no-trim';
import unified from 'unified';
import type { Node } from 'unist';
import { renderAttachmentTagParser } from '../render_attachment_plugin';

/**
 * Parses markdown the same way the chat renderer does (remark parser + the
 * render_attachment tag parser transformer), so the test exercises the real
 * mdast shapes produced by remark rather than hand-built trees.
 */
export const parseMarkdown = (markdown: string): Node => {
  const processor = unified().use(remarkParse).use(renderAttachmentTagParser);
  const tree = processor.parse(markdown);
  return processor.runSync(tree);
};
