/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText, EuiPanel } from '@elastic/eui';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
  ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { isToolCallStep, platformCoreTools } from '@kbn/agent-builder-common';
import { isOtherResult } from '@kbn/agent-builder-common/tools';
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
 * 2. Version from cumulative attachment refs for this round
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

/**
 * Extracts the highest attachment version produced by create_a2ui_surface tool
 * calls in the current round's steps. Returns undefined if no matching tool
 * result exists for this attachment.
 *
 * Used to detect when the server has created a newer version that may not yet
 * be reflected in cumulative attachment refs (which only update after a full
 * conversation refetch).
 */
export const getToolResultAttachmentVersion = (
  attachmentId: string,
  steps: ConversationRoundStep[] | undefined
): number | undefined => {
  if (!steps) return undefined;

  let maxVersion: number | undefined;

  for (const step of steps) {
    if (!isToolCallStep(step) || step.tool_id !== platformCoreTools.createA2UISurface) {
      continue;
    }
    for (const result of step.results) {
      if (!isOtherResult(result)) continue;
      const { data } = result;
      if (
        'attachment_id' in data &&
        'version' in data &&
        data.attachment_id === attachmentId &&
        typeof data.version === 'number'
      ) {
        maxVersion = maxVersion === undefined ? data.version : Math.max(maxVersion, data.version);
      }
    }
  }

  return maxVersion;
};

interface RenderAttachmentRendererProps {
  attachmentsService: AttachmentsService;
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
  isSidebar: boolean;
  currentRoundSteps?: ConversationRoundStep[];
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
  currentRoundSteps,
}: RenderAttachmentRendererProps) => {
  const screenContext = getScreenContext(conversationAttachments);

  return (props: RenderAttachmentElementAttributes) => {
    const { attachmentId, version: explicitVersion } = props;

    if (!attachmentId || !conversationId) {
      return null;
    }

    const attachment = conversationAttachments?.find((att) => att.id === attachmentId);

    if (!attachment) {
      return (
        <EuiPanel color="subdued" paddingSize="l" hasBorder={false} hasShadow={false}>
          <EuiSkeletonText lines={3} />
        </EuiPanel>
      );
    }

    const toolResultVersion = getToolResultAttachmentVersion(attachmentId, currentRoundSteps);

    const versionToUse =
      toolResultVersion ??
      resolveAttachmentVersion({
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
      return (
        <EuiPanel color="subdued" paddingSize="l" hasBorder={false} hasShadow={false}>
          <EuiSkeletonText lines={3} />
        </EuiPanel>
      );
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
