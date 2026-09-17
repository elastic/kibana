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
 * Parses markdown the same way the chat renderer does (remark parser + a tag
 * parser transformer), so tests exercise the real mdast shapes produced by
 * remark rather than hand-built trees. Defaults to the render_attachment parser;
 * pass another tag parser (e.g. `renderTagParser`) to exercise it instead.
 */
export const parseMarkdown = (
  markdown: string,
  tagParser: typeof renderAttachmentTagParser = renderAttachmentTagParser
): Node => {
  const processor = unified().use(remarkParse).use(tagParser);
  const tree = processor.parse(markdown);
  return processor.runSync(tree);
};
