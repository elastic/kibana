/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import {
  renderAttachmentElement,
  type RenderAttachmentElementAttributes,
} from '@kbn/agent-builder-common/tools/custom_rendering';
import type { AttachmentsService } from '../../../../../../services';
import { createTagParser } from './utils';

/**
 * Parser for <render_attachment> tags in markdown.
 * Converts HTML/text nodes containing render_attachment tags into structured AST nodes.
 */
export const renderAttachmentTagParser = createTagParser({
  tagName: renderAttachmentElement.tagName,
  getAttributes: (value, extractAttr) => ({
    attachmentId: extractAttr(value, renderAttachmentElement.attributes.attachmentId),
    version: extractAttr(value, renderAttachmentElement.attributes.version),
  }),
  assignAttributes: (node, attributes) => {
    node.type = renderAttachmentElement.tagName;
    node.attachmentId = attributes.attachmentId;
    node.attachmentVersion = attributes.version;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: renderAttachmentElement.tagName,
    attachmentId: attributes.attachmentId,
    attachmentVersion: attributes.version,
    position,
  }),
});

interface RenderAttachmentRendererProps {
  attachmentsService: AttachmentsService;
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
  isSidebar: boolean;
}
/**
 * Creates a renderer for <render_attachment> tags.
 */
export const createRenderAttachmentRenderer = ({
  attachmentsService,
  conversationAttachments,
  attachmentRefs,
  conversationId,
  isSidebar,
}: RenderAttachmentRendererProps) => {
  return (props: RenderAttachmentElementAttributes) => {
    // TODO: Implement the renderer
    // 1. Find the attachment by ID in conversationAttachments
    // 2. Resolve the version (explicit or from attachmentRefs)
    // 3. Get the renderContent function from attachmentsService
    // 4. Render the attachment content with action buttons
    return null;
  };
};
