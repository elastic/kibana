/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import { getCommentAttachmentType } from './comment';
import { getFileType } from './file/file_type';
import { getLensAttachmentType } from './lens';
import { getDashboardAttachmentType } from './dashboard';
import { getMapAttachmentType } from './map';
import { getDiscoverSessionAttachmentType } from './saved_object';

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry,
  unifiedRegistry: UnifiedAttachmentTypeRegistry
) => {
  externalRefRegistry.register(getFileType());
  unifiedRegistry.register(getLensAttachmentType());
  unifiedRegistry.register(getCommentAttachmentType());
  unifiedRegistry.register(getDashboardAttachmentType());
  unifiedRegistry.register(getDiscoverSessionAttachmentType());
  unifiedRegistry.register(getMapAttachmentType());
};
