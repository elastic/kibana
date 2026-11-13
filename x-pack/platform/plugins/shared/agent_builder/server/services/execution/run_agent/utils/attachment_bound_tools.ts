/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getVersion, toAttachment } from '@kbn/agent-builder-common/attachments';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import type {
  AttachmentFormatContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';

/**
 * The tools an attachment binds to itself at one of its versions (`getBoundedTools`), ready to run.
 * Bound tools are optional, so a missing version, an unknown type or a failing `format` yields none.
 */
export const resolveAttachmentBoundTools = async ({
  attachment,
  version,
  attachmentsService,
  formatContext,
}: {
  attachment: VersionedAttachment;
  version: number;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
}): Promise<ExecutableTool[]> => {
  const attachmentVersion = getVersion(attachment, version);
  if (!attachmentVersion) {
    return [];
  }

  const definition = attachmentsService.getTypeDefinition(attachment.type);
  if (!definition) {
    return [];
  }

  try {
    const formatted = await definition.format(
      toAttachment(attachment, attachmentVersion),
      formatContext
    );
    const boundedTools = formatted.getBoundedTools ? await formatted.getBoundedTools() : [];
    return boundedTools.map((tool) => attachmentsService.convertAttachmentTool(tool));
  } catch {
    // Ignore formatting errors; bounded tools are optional.
    return [];
  }
};

/** The tools bound to the active attachments, each attachment at its current version. */
export const resolveActiveAttachmentBoundTools = async ({
  attachmentStateManager,
  attachmentsService,
  formatContext,
}: {
  attachmentStateManager: AttachmentStateManager;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
}): Promise<ExecutableTool[]> => {
  const attachments = attachmentStateManager.getActive();
  const tools = await Promise.all(
    attachments.map((attachment) =>
      resolveAttachmentBoundTools({
        attachment,
        version: attachment.current_version,
        attachmentsService,
        formatContext,
      })
    )
  );
  // `Promise.all` keeps the attachment order, so on an id clash the last attachment's tool wins
  return tools.flat();
};
