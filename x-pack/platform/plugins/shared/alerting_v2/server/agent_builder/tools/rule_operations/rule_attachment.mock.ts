/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';

/** A conversation attachment record holding one version of `data`. */
export const createAttachmentRecord = ({
  id = 'attachment-1',
  type = RULE_ATTACHMENT_TYPE,
  data,
  origin,
  version = 1,
}: {
  id?: string;
  type?: string;
  data: unknown;
  origin?: string;
  version?: number;
}): VersionedAttachment => ({
  id,
  type,
  versions: [{ version, data, created_at: '2026-01-01T00:00:00.000Z', content_hash: 'hash' }],
  current_version: version,
  ...(origin ? { origin } : {}),
});

/** Makes the context's attachment store echo back what tools add or update. */
export const mockAttachmentWrites = (ctx: ToolHandlerContextMock) => {
  ctx.attachments.add.mockImplementation(async ({ id = 'new-attachment', data }) =>
    createAttachmentRecord({ id, data })
  );
  ctx.attachments.update.mockImplementation(async (id, { data }) =>
    createAttachmentRecord({ id, data, version: 2 })
  );
};
