/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ResolverBoundedToolItemSnapshot } from '@kbn/agent-context-layer-common';

export const attachmentToResolverBoundedToolSnapshot = (
  attachment: Attachment
): ResolverBoundedToolItemSnapshot => ({
  type: attachment.type,
  ...(attachment.origin !== undefined ? { origin: attachment.origin } : {}),
  data: attachment.data,
  instanceId: attachment.id,
});
