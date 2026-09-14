/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentsSetup } from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { InvestigationsService } from '../storage/investigations_service';
import { createImpactAttachmentType } from './impact_attachment_type';
import { createHypothesesAttachmentType } from './hypotheses_attachment_type';
import { createRecommendationsAttachmentType } from './recommendations_attachment_type';
import { createBlindSpotsAttachmentType } from './blind_spots_attachment_type';

/**
 * Registers all four investigation attachment types with the Agent Builder attachment registry.
 * Accepts the shared InvestigationsService which this plugin owns and instantiates.
 * resolve / isStale call the service at request time, after all plugins have started.
 */
export const registerInvestigationAttachmentTypes = (
  attachmentRegistry: AttachmentsSetup,
  service: InvestigationsService
): void => {
  attachmentRegistry.registerType(
    createImpactAttachmentType(service) as AttachmentTypeDefinition
  );
  attachmentRegistry.registerType(
    createHypothesesAttachmentType(service) as AttachmentTypeDefinition
  );
  attachmentRegistry.registerType(
    createRecommendationsAttachmentType(service) as AttachmentTypeDefinition
  );
  attachmentRegistry.registerType(
    createBlindSpotsAttachmentType(service) as AttachmentTypeDefinition
  );
};
