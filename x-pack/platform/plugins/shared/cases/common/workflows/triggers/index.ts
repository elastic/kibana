/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { Owner as OwnerSchema } from '../../bundled-types.gen';
import {
  CASE_TRIGGER_EVENT_SCHEMA_CASE_ID_DESCRIPTION,
  CASE_TRIGGER_EVENT_SCHEMA_OWNER_DESCRIPTION,
  CASE_UPDATED_TRIGGER_EVENT_SCHEMA_UPDATED_FIELDS_DESCRIPTION,
  ATTACHMENTS_ADDED_TRIGGER_EVENT_SCHEMA_ATTACHMENT_IDS_DESCRIPTION,
  ATTACHMENTS_ADDED_TRIGGER_EVENT_SCHEMA_ATTACHMENT_TYPE_DESCRIPTION,
  COMMENTS_ADDED_TRIGGER_EVENT_SCHEMA_COMMENT_IDS_DESCRIPTION,
  CASE_STATUS_UPDATED_TRIGGER_EVENT_SCHEMA_STATUS_DESCRIPTION,
  CASE_STATUS_UPDATED_TRIGGER_EVENT_SCHEMA_PREVIOUS_STATUS_DESCRIPTION,
} from '../translations';

export const CaseCreatedTriggerId = 'cases.caseCreated' as const;

const baseCaseEventSchema = z.object({
  owner: OwnerSchema.meta({ description: CASE_TRIGGER_EVENT_SCHEMA_OWNER_DESCRIPTION }),
  caseId: z.string().meta({ description: CASE_TRIGGER_EVENT_SCHEMA_CASE_ID_DESCRIPTION }),
});

export const caseCreatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CaseCreatedTriggerId,
  eventSchema: baseCaseEventSchema,
};

export const CaseUpdatedTriggerId = 'cases.caseUpdated' as const;

const caseUpdatedEventSchema = baseCaseEventSchema.extend({
  updatedFields: z
    .array(z.string())
    .optional()
    .meta({ description: CASE_UPDATED_TRIGGER_EVENT_SCHEMA_UPDATED_FIELDS_DESCRIPTION }),
});

export const caseUpdatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CaseUpdatedTriggerId,
  eventSchema: caseUpdatedEventSchema,
};

export const CaseStatusUpdatedTriggerId = 'cases.caseStatusUpdated' as const;

const caseStatusUpdatedEventSchema = baseCaseEventSchema.extend({
  status: z
    .string()
    .meta({ description: CASE_STATUS_UPDATED_TRIGGER_EVENT_SCHEMA_STATUS_DESCRIPTION }),
  previousStatus: z
    .string()
    .meta({ description: CASE_STATUS_UPDATED_TRIGGER_EVENT_SCHEMA_PREVIOUS_STATUS_DESCRIPTION }),
});

export const caseStatusUpdatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CaseStatusUpdatedTriggerId,
  eventSchema: caseStatusUpdatedEventSchema,
};

export const AttachmentsAddedTriggerId = 'cases.attachmentsAdded' as const;

const attachmentsAddedEventSchema = baseCaseEventSchema.extend({
  attachmentIds: z
    .array(z.string())
    .meta({ description: ATTACHMENTS_ADDED_TRIGGER_EVENT_SCHEMA_ATTACHMENT_IDS_DESCRIPTION }),
  attachmentType: z
    .string()
    .meta({ description: ATTACHMENTS_ADDED_TRIGGER_EVENT_SCHEMA_ATTACHMENT_TYPE_DESCRIPTION }),
});

export const attachmentsAddedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: AttachmentsAddedTriggerId,
  eventSchema: attachmentsAddedEventSchema,
};

export const CommentsAddedTriggerId = 'cases.commentsAdded' as const;

const CommentsAddedEventSchema = baseCaseEventSchema.extend({
  commentIds: z
    .array(z.string())
    .meta({ description: COMMENTS_ADDED_TRIGGER_EVENT_SCHEMA_COMMENT_IDS_DESCRIPTION }),
});

export const commentsAddedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CommentsAddedTriggerId,
  eventSchema: CommentsAddedEventSchema,
};
