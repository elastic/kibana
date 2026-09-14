/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentsSetup } from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { InvestigationsService } from '../services/investigations_service';
import { createImpactAttachmentType } from './impact_attachment_type';
import { createHypothesesAttachmentType } from './hypotheses_attachment_type';
import { createRecommendationsAttachmentType } from './recommendations_attachment_type';
import { createBlindSpotsAttachmentType } from './blind_spots_attachment_type';

/**
 * Registers all four investigation attachment types with the Agent Builder attachment registry.
 * Accepts a lazy `getService` getter so the types can be registered during `setup()` while the
 * service is only materialised after `start()` (resolve / isStale are called at request time).
 */
export const registerInvestigationAttachmentTypes = (
  attachmentRegistry: AttachmentsSetup,
  getService: () => InvestigationsService
): void => {
  attachmentRegistry.registerType(
    createImpactAttachmentType(getService) as AttachmentTypeDefinition
  );
  attachmentRegistry.registerType(
    createHypothesesAttachmentType(getService) as AttachmentTypeDefinition
  );
  attachmentRegistry.registerType(
    createRecommendationsAttachmentType(getService) as AttachmentTypeDefinition
  );
  attachmentRegistry.registerType(
    createBlindSpotsAttachmentType(getService) as AttachmentTypeDefinition
  );
};
