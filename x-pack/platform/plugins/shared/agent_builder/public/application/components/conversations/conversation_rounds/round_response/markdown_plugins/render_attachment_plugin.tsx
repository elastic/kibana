/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  VersionedAttachment,
  UnknownAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { getLatestVersion, getVersion } from '@kbn/agent-builder-common/attachments';
import {
  renderAttachmentElement,
  type RenderAttachmentElementAttributes,
} from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentsService } from '../../../../../../services';
import { createTagParser } from './utils';

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

export const createRenderAttachmentRenderer = ({
  attachmentsService,
  conversationAttachments,
  attachmentRefs,
}: {
  attachmentsService: AttachmentsService;
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
}) => {
  return ({ attachmentId, version }: RenderAttachmentElementAttributes) => {
    if (!attachmentId) {
      return (
        <EuiText>
          {i18n.translate('xpack.agentBuilder.renderAttachment.missingId', {
            defaultMessage: 'Attachment missing {attribute}.',
            values: { attribute: renderAttachmentElement.attributes.attachmentId },
          })}
        </EuiText>
      );
    }

    const attachment = conversationAttachments?.find((item) => item.id === attachmentId);
    if (!attachment) {
      return (
        <EuiText>
          {i18n.translate('xpack.agentBuilder.renderAttachment.notFound', {
            defaultMessage: 'Unable to find attachment with id {attachmentId}.',
            values: { attachmentId },
          })}
        </EuiText>
      );
    }

    if (attachment.hidden) {
      return (
        <EuiText>
          {i18n.translate('xpack.agentBuilder.renderAttachment.hidden', {
            defaultMessage: 'Attachment {attachmentId} is hidden.',
            values: { attachmentId },
          })}
        </EuiText>
      );
    }

    const parsedVersion = typeof version === 'string' ? parseInt(version, 10) : version;
    const explicitVersion =
      parsedVersion !== undefined && !Number.isNaN(parsedVersion) ? parsedVersion : undefined;
    const refVersion = attachmentRefs
      ? getAttachmentRefVersion(attachmentRefs, attachmentId)
      : undefined;
    const resolvedVersion = explicitVersion ?? refVersion;
    const versionToRender = resolvedVersion
      ? getVersion(attachment, resolvedVersion)
      : getLatestVersion(attachment);

    if (!versionToRender) {
      return (
        <EuiText>
          {resolvedVersion
            ? i18n.translate('xpack.agentBuilder.renderAttachment.noVersion', {
                defaultMessage: 'Unable to find attachment version {version} for {attachmentId}.',
                values: { attachmentId, version: resolvedVersion },
              })
            : i18n.translate('xpack.agentBuilder.renderAttachment.noContent', {
                defaultMessage: 'Unable to find attachment content for {attachmentId}.',
                values: { attachmentId },
              })}
        </EuiText>
      );
    }

    const RenderContent = attachmentsService.getRenderContent(attachment.type);
    const attachmentForRender: UnknownAttachment = {
      id: attachment.id,
      type: attachment.type,
      data: versionToRender.data,
      hidden: attachment.hidden,
    };

    return <RenderContent attachment={attachmentForRender} version={versionToRender} />;
  };
};

const getAttachmentRefVersion = (
  refs: AttachmentVersionRef[],
  attachmentId: string
): number | undefined => {
  let matched: number | undefined;
  for (const ref of refs) {
    if (ref.attachment_id === attachmentId) {
      matched = ref.version;
    }
  }
  return matched;
};
