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
  ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  renderAttachmentElement,
  type RenderAttachmentElementAttributes,
} from '@kbn/agent-builder-common/tools/custom_rendering';
import type { AttachmentsService } from '../../../../../../services';
import { createTagParser } from './utils';
import { InlineAttachmentWithActions } from '../attachments/inline_attachment_with_actions';

interface ResolveAttachmentVersionParams {
  explicitVersion: string | number | undefined;
  attachmentId: string;
  attachmentRefs: AttachmentVersionRef[] | undefined;
  attachment: VersionedAttachment;
}

/**
 * Resolves the version to use for an attachment.
 * Priority:
 * 1. Explicit version from tag attributes
 * 2. Version from cumulative attachment refs (highest version seen up to this round)
 * 3. Latest available version as fallback
 */
export const resolveAttachmentVersion = ({
  explicitVersion,
  attachmentId,
  attachmentRefs,
  attachment,
}: ResolveAttachmentVersionParams): number | undefined => {
  if (explicitVersion !== undefined) {
    const parsed =
      typeof explicitVersion === 'string' ? Number.parseInt(explicitVersion, 10) : explicitVersion;
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const ref = attachmentRefs?.find((r) => r.attachment_id === attachmentId);
  if (ref) {
    return ref.version;
  }

  // Final fallback: use the latest version
  return attachment.versions.at(-1)?.version;
};

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

const getScreenContext = (
  conversationAttachments?: VersionedAttachment[]
): ScreenContextAttachmentData | undefined => {
  const screenContextAttachment = conversationAttachments?.find(
    (att) => att.type === AttachmentType.screenContext
  );
  if (!screenContextAttachment) {
    return undefined;
  }
  const latest = getLatestVersion(screenContextAttachment);
  return latest?.data as ScreenContextAttachmentData | undefined;
};

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
  const screenContext = getScreenContext(conversationAttachments);

  return (props: RenderAttachmentElementAttributes) => {
    const { attachmentId, version: explicitVersion } = props;

    if (!attachmentId || !conversationId) {
      return null;
    }

    const attachment = conversationAttachments?.find((att) => att.id === attachmentId);

    if (!attachment) {
      return null;
    }

    const versionToUse = resolveAttachmentVersion({
      explicitVersion,
      attachmentId,
      attachmentRefs,
      attachment,
    });

    if (versionToUse === undefined) {
      return null;
    }

    const versionData = attachment.versions.find((v) => v.version === versionToUse);

    if (!versionData) {
      return null;
    }

    return (
      <InlineAttachmentWithActions
        attachment={{
          id: attachment.id,
          type: attachment.type,
          data: versionData.data,
          hidden: attachment.hidden,
          origin: attachment.origin,
        }}
        conversationId={conversationId}
        attachmentsService={attachmentsService}
        isSidebar={isSidebar}
        screenContext={screenContext}
        version={versionToUse}
      />
    );
  };
};
