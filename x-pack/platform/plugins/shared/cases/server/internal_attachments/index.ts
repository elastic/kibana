/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import {
  commentAttachmentType,
  lensAttachmentType,
  stackAlertAttachmentType,
  fileAttachmentType,
  dashboardAttachmentType,
  mapAttachmentType,
  discoverSessionAttachmentType,
  proposalAttachmentType,
} from '../attachment_framework/attachments';

export interface RegisterInternalAttachmentsOptions {
  /** The proposals plugin is disabled by default; without it a proposal cannot be read. */
  hasProposalsPluginEnabled?: boolean;
}

export const registerInternalAttachments = (
  unifiedRegistry: UnifiedAttachmentTypeRegistry,
  { hasProposalsPluginEnabled = false }: RegisterInternalAttachmentsOptions = {}
) => {
  unifiedRegistry.register(fileAttachmentType);
  unifiedRegistry.register(lensAttachmentType);
  unifiedRegistry.register(commentAttachmentType);
  unifiedRegistry.register(stackAlertAttachmentType);
  unifiedRegistry.register(dashboardAttachmentType);
  unifiedRegistry.register(mapAttachmentType);
  unifiedRegistry.register(discoverSessionAttachmentType);
  if (hasProposalsPluginEnabled) {
    unifiedRegistry.register(proposalAttachmentType);
  }
};
