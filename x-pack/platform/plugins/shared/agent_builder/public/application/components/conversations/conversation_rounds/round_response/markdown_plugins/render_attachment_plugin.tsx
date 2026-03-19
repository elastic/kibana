/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  VersionedAttachment,
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
  explicitVersion: string | number;
  attachment: VersionedAttachment;
}

/**
 * Resolves explicit version from tag attributes.
 */
export const resolveAttachmentVersion = ({
  explicitVersion,
  attachment,
}: ResolveAttachmentVersionParams): number | undefined => {
  if (explicitVersion !== undefined) {
    const parsedVersion =
      typeof explicitVersion === 'string' ? Number.parseInt(explicitVersion, 10) : explicitVersion;

    return Number.isInteger(parsedVersion) && parsedVersion > 0 ? parsedVersion : undefined;
  }

  return attachment.versions.reduce<number | undefined>(
    (max, r) => (max === undefined || r.version > max ? r.version : max),
    undefined
  );
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
    node.version = attributes.version;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: renderAttachmentElement.tagName,
    attachmentId: attributes.attachmentId,
    version: attributes.version,
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
  conversationId?: string;
  isSidebar: boolean;
}
/**
 * Creates a renderer for <render_attachment> tags.
 */
export const createRenderAttachmentRenderer = ({
  attachmentsService,
  conversationAttachments,
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

    const versionToUse = resolveAttachmentVersion({ explicitVersion, attachment });

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
