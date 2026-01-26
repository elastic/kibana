/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalReferenceAttachmentTypeRegistry } from '../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../client/attachment_framework/persistable_state_registry';
import type { RegisteredAttachmentTypeRegistry } from '../client/attachment_framework/attachment_registry';
import { getFileType } from '../components/files/file_type';
import { getVisualizationAttachmentType } from '../components/visualizations/attachment';
import { getDashboardType } from '../components/attachments/dashboard/dashboard_type';

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry,
  persistableStateRegistry: PersistableStateAttachmentTypeRegistry,
  attachmentRegistry: RegisteredAttachmentTypeRegistry
) => {
  externalRefRegistry.register(getFileType());
  attachmentRegistry.register(getDashboardType());
  persistableStateRegistry.register(getVisualizationAttachmentType());
};
