/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import { getCommentAttachmentType } from './comment';
import { getFileAttachmentType } from './file';
import { getVisualizationAttachmentType } from './lens';

export const registerInternalAttachments = (unifiedRegistry: UnifiedAttachmentTypeRegistry) => {
  unifiedRegistry.register(getFileAttachmentType());
  unifiedRegistry.register(getVisualizationAttachmentType());
  unifiedRegistry.register(getCommentAttachmentType());
};
