/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACHMENTS_ADDED_EVENT_TYPE,
  CASE_CREATED_EVENT_TYPE,
  CASE_STATUS_CHANGED_EVENT_TYPE,
  CASE_UPDATED_EVENT_TYPE,
  COMMENTS_ADDED_EVENT_TYPE,
} from '@kbn/domain-events/events/cases';
import { createServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import {
  attachmentsAddedTriggerCommonDefinition,
  caseCreatedTriggerCommonDefinition,
  caseStatusUpdatedTriggerCommonDefinition,
  caseUpdatedTriggerCommonDefinition,
  commentsAddedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';
import { normalizeAttachmentType } from './utils';

export const caseCreatedTriggerDefinition = createServerTriggerDefinition({
  ...caseCreatedTriggerCommonDefinition,
  domainEventType: CASE_CREATED_EVENT_TYPE,
});

export const caseUpdatedTriggerDefinition = createServerTriggerDefinition({
  ...caseUpdatedTriggerCommonDefinition,
  domainEventType: CASE_UPDATED_EVENT_TYPE,
});

export const caseStatusUpdatedTriggerDefinition = createServerTriggerDefinition({
  ...caseStatusUpdatedTriggerCommonDefinition,
  domainEventType: CASE_STATUS_CHANGED_EVENT_TYPE,
});

export const attachmentsAddedTriggerDefinition = createServerTriggerDefinition({
  ...attachmentsAddedTriggerCommonDefinition,
  domainEventType: ATTACHMENTS_ADDED_EVENT_TYPE,
  mapEvent: (event) => ({
    ...event.payload,
    attachmentType: normalizeAttachmentType(event.payload.attachmentType),
  }),
});

export const commentsAddedTriggerDefinition = createServerTriggerDefinition({
  ...commentsAddedTriggerCommonDefinition,
  domainEventType: COMMENTS_ADDED_EVENT_TYPE,
});
