/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { Spec, SpecNode } from './pack';

const createTagPattern = () => new RegExp(`<${renderAttachmentElement.tagName}\\b[^>]*\\/?>`, 'gi');

/**
 * Converts a reply into a spec: its markdown becomes `markdown` nodes. `<render_attachment>` tags
 * are dropped. Returns `undefined` when nothing is left.
 */
export const replyToSpec = (message: string): Spec | undefined => {
  const body: SpecNode[] = [];
  let cursor = 0;

  const pushMarkdown = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      body.push({ type: 'markdown', text: trimmed });
    }
  };

  for (const match of message.matchAll(createTagPattern())) {
    pushMarkdown(message.slice(cursor, match.index));
    cursor = match.index + match[0].length;
  }

  pushMarkdown(message.slice(cursor));

  return body.length > 0 ? { type: 'view', body } : undefined;
};

/** Removes the `<render_attachment>` tags of a reply. */
export const stripAttachmentTags = (message: string): string =>
  message.replace(createTagPattern(), '').trim();
