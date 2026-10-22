/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  customAppContextAttachmentDataSchema,
  type CustomAppContextAttachmentData,
} from './app_context_attachment';

/**
 * Reads the current data of an app context attachment. A conversation holds attachments of many
 * kinds, so the store hands back unknown payloads; validating with the schema the attachment type
 * registers narrows the type without asserting it.
 *
 * Kept out of `app_context_attachment.ts` because that module is reachable from the page-load
 * bundle, and this one pulls in `@kbn/agent-builder-common/attachments`.
 */
export const readAppContextData = (
  attachment: VersionedAttachment
): CustomAppContextAttachmentData | undefined => {
  const parsed = customAppContextAttachmentDataSchema.safeParse(getLatestVersion(attachment)?.data);
  return parsed.success ? parsed.data : undefined;
};
