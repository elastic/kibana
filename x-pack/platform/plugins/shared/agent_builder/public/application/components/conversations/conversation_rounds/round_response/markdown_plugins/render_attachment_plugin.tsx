/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { AttachmentWithActions } from '../attachment_with_actions';

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
    const { attachmentId, version: explicitVersion } = props;

    if (!attachmentId || !conversationId) {
      return null;
    }

    const attachment = conversationAttachments?.find((att) => att.id === attachmentId);

    if (!attachment) {
      return null;
    }

    // Resolve version: explicit > from refs > current_version
    let versionToUse: number;
    if (explicitVersion !== undefined) {
      versionToUse =
        typeof explicitVersion === 'string' ? parseInt(explicitVersion, 10) : explicitVersion;
    } else {
      const refVersion = attachmentRefs?.find((r) => r.attachment_id === attachmentId)?.version;
      versionToUse = refVersion ?? attachment.current_version;
    }

    const versionData = attachment.versions.find((v) => v.version === versionToUse);

    if (!versionData) {
      return null;
    }

    return (
      <AttachmentWithActions
        attachment={{
          id: attachment.id,
          type: attachment.type,
          data: versionData.data,
          hidden: attachment.hidden,
        }}
        conversationId={conversationId}
        attachmentsService={attachmentsService}
        isSidebar={isSidebar}
      />
    );
  };
};
