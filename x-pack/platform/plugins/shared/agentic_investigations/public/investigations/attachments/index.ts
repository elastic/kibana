/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';
import { impactAttachmentUIDefinition } from './impact_attachment_ui';
import { hypothesesAttachmentUIDefinition } from './hypotheses_attachment_ui';
import { recommendationsAttachmentUIDefinition } from './recommendations_attachment_ui';
import { blindSpotsAttachmentUIDefinition } from './blind_spots_attachment_ui';

/** Registers all four investigation attachment UI types with the agent-builder attachment service. */
export const registerInvestigationAttachmentUITypes = (
  attachmentUIRegistry: AttachmentServiceStartContract
): void => {
  attachmentUIRegistry.addAttachmentType(
    INVESTIGATION_ATTACHMENT_IDS.IMPACT,
    impactAttachmentUIDefinition
  );
  attachmentUIRegistry.addAttachmentType(
    INVESTIGATION_ATTACHMENT_IDS.HYPOTHESES,
    hypothesesAttachmentUIDefinition
  );
  attachmentUIRegistry.addAttachmentType(
    INVESTIGATION_ATTACHMENT_IDS.RECOMMENDATIONS,
    recommendationsAttachmentUIDefinition
  );
  attachmentUIRegistry.addAttachmentType(
    INVESTIGATION_ATTACHMENT_IDS.BLIND_SPOTS,
    blindSpotsAttachmentUIDefinition
  );
};
