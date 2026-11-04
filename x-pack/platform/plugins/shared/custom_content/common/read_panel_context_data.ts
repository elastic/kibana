/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  customContentContextAttachmentDataSchema,
  type CustomContentContextAttachmentData,
} from './panel_context_attachment';

/**
 * Reads a panel context attachment's current data.
 *
 * A conversation holds attachments of many types, so the store hands back `unknown` payloads.
 * Validating with the same schema the attachment type registers as its `validate` narrows the type
 * without asserting it — nothing the framework accepted on write can fail here.
 *
 * Kept out of `panel_context_attachment.ts` because that module is reachable from the plugin's
 * page-load bundle, and this one pulls in `@kbn/agent-builder-common/attachments`.
 */
export const readPanelContextData = (
  attachment: VersionedAttachment
): CustomContentContextAttachmentData | undefined => {
  const parsed = customContentContextAttachmentDataSchema.safeParse(
    getLatestVersion(attachment)?.data
  );
  return parsed.success ? parsed.data : undefined;
};
