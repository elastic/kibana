/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { AttachmentNode, Spec, SpecNode } from './pack';

const { tagName, attributes } = renderAttachmentElement;

const createTagPattern = () => new RegExp(`<${tagName}\\b[^>]*\\/?>`, 'gi');

/** Matches the attribute at the start or after whitespace, so `id` doesn't match `field-id`. */
const getAttribute = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i'))?.[1];

const toAttachmentNode = (tag: string): AttachmentNode | undefined => {
  const attachmentId = getAttribute(tag, attributes.attachmentId);
  if (!attachmentId) {
    return;
  }

  const version = Number(getAttribute(tag, attributes.version));

  return {
    type: 'attachment',
    attachmentId,
    ...(Number.isInteger(version) && version > 0 ? { version } : {}),
  };
};

/**
 * Converts a reply into a spec: its markdown becomes `markdown` nodes, and each
 * `<render_attachment>` tag becomes an `attachment` node at the same position.
 * Tags without an id are dropped. Returns `undefined` when nothing is left.
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

    const node = toAttachmentNode(match[0]);
    if (node) {
      body.push(node);
    }

    cursor = match.index + match[0].length;
  }

  pushMarkdown(message.slice(cursor));

  return body.length > 0 ? { type: 'view', body } : undefined;
};
