/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IncidentTimelineEntryPayloadSchema } from '../../../common/types/domain/attachment/incident_timeline_entry/v2';
import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { UnifiedAttachmentTypeSetup } from '../types';

export const incidentTimelineEntryAttachmentType: UnifiedAttachmentTypeSetup = {
  id: INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE,
  schema: IncidentTimelineEntryPayloadSchema,
  workflowSchema: false,
};
