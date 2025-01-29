/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalReferenceAttachmentTypeRegistry } from '../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../client/attachment_framework/persistable_state_registry';
import { getFileType } from '../components/files/file_type';
import { getVisualizationAttachmentType } from '../components/visualizations/attachment';

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry,
  persistableStateRegistry: PersistableStateAttachmentTypeRegistry
) => {
  externalRefRegistry.register(getFileType());
  persistableStateRegistry.register(getVisualizationAttachmentType());
};
