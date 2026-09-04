/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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
  EXTENDED_FIELDS_UPDATED_TRIGGER_EVENT_SCHEMA_CHANGED_FIELDS_DESCRIPTION,
} from '../translations';

export const CaseCreatedTriggerId = 'cases.caseCreated' as const;

const baseCaseEventSchema = z.object({
  // We're adding `string()` to the union to allow for more lenient runtime checks in test envs.
  // The OwnerSchema is still needed and should not be removed.
  owner: z
    .union([OwnerSchema, z.string().min(1).max(50)])
    .meta({ description: CASE_TRIGGER_EVENT_SCHEMA_OWNER_DESCRIPTION }),
  caseId: z.string().meta({ description: CASE_TRIGGER_EVENT_SCHEMA_CASE_ID_DESCRIPTION }),
});

export const caseCreatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CaseCreatedTriggerId,
  stability: 'tech_preview',
  eventSchema: baseCaseEventSchema,
  title: i18n.translate('xpack.cases.workflowTriggers.caseCreated.title', {
    defaultMessage: 'Cases - Case created',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.caseCreated.description', {
    defaultMessage: 'Emitted when a case is created.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.caseCreated.documentation.details', {
      defaultMessage:
        'Emitted after a case is created. The payload includes event.caseId and event.owner, which you can use in trigger conditions.',
    }),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.caseCreated.documentation.example', {
        defaultMessage: `## Run for Security cases only
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution"'
\`\`\``,
        values: {
          triggerId: CaseCreatedTriggerId,
        },
      }),
    ],
  },
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
  stability: 'tech_preview',
  eventSchema: caseUpdatedEventSchema,
  title: i18n.translate('xpack.cases.workflowTriggers.caseUpdated.title', {
    defaultMessage: 'Cases - Case updated',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.caseUpdated.description', {
    defaultMessage: 'Emitted when a case is updated.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.caseUpdated.documentation.details', {
      defaultMessage:
        'Emitted after case updates. Use event.updatedFields to filter by which fields changed, event.caseId to match a specific case, and event.owner to scope by case owner.',
    }),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.caseUpdated.documentation.example', {
        defaultMessage: `## Run when Security case status changes
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution" and event.updatedFields: "status"'
\`\`\``,
        values: {
          triggerId: CaseUpdatedTriggerId,
        },
      }),
    ],
  },
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
  stability: 'tech_preview',
  eventSchema: caseStatusUpdatedEventSchema,
  title: i18n.translate('xpack.cases.workflowTriggers.caseStatusUpdated.title', {
    defaultMessage: 'Cases - Case status updated',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.caseStatusUpdated.description', {
    defaultMessage: 'Emitted when a case status is updated.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.cases.workflowTriggers.caseStatusUpdated.documentation.details',
      {
        defaultMessage:
          'Emitted after case status updates. Includes the current and previous status.',
      }
    ),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.caseStatusUpdated.documentation.example', {
        defaultMessage: `## Run when Security case is closed
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution" and event.status: "closed"'
\`\`\``,
        values: {
          triggerId: CaseStatusUpdatedTriggerId,
        },
      }),
    ],
  },
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
  stability: 'tech_preview',
  eventSchema: attachmentsAddedEventSchema,
  title: i18n.translate('xpack.cases.workflowTriggers.attachmentsAdded.title', {
    defaultMessage: 'Cases - Attachments added',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.attachmentsAdded.description', {
    defaultMessage: 'Emitted when one or more attachments of the same type are added to a case.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.attachmentsAdded.documentation.details', {
      defaultMessage:
        'Emitted after attachments are added to a case, once per attachment type involved. The payload includes event.caseId, event.owner, event.attachmentIds (all IDs added in that operation for this type), and event.attachmentType (e.g. "comment", "alert"). Use KQL on event.* for trigger conditions.',
    }),
    examples: [
      i18n.translate(
        'xpack.cases.workflowTriggers.attachmentsAdded.documentation.exampleCaseFilter',
        {
          defaultMessage: `## Run only for Security cases
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution"'
\`\`\``,
          values: {
            triggerId: AttachmentsAddedTriggerId,
          },
        }
      ),
      i18n.translate(
        'xpack.cases.workflowTriggers.attachmentsAdded.documentation.exampleTypeFilter',
        {
          defaultMessage: `## Run only when a comment is added
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.attachmentType: "comment"'
\`\`\``,
          values: {
            triggerId: AttachmentsAddedTriggerId,
          },
        }
      ),
    ],
  },
};

export const CommentsAddedTriggerId = 'cases.commentsAdded' as const;

const CommentsAddedEventSchema = baseCaseEventSchema.extend({
  commentIds: z
    .array(z.string())
    .meta({ description: COMMENTS_ADDED_TRIGGER_EVENT_SCHEMA_COMMENT_IDS_DESCRIPTION }),
});

export const commentsAddedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CommentsAddedTriggerId,
  stability: 'tech_preview',
  eventSchema: CommentsAddedEventSchema,
  title: i18n.translate('xpack.cases.workflowTriggers.commentsAdded.title', {
    defaultMessage: 'Cases - Comments added',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.commentsAdded.description', {
    defaultMessage: 'Emitted when one or more comments are added to a case.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.commentsAdded.documentation.details', {
      defaultMessage:
        'Emitted after comments are added to a case. The payload includes event.caseId, event.owner, event.commentIds. Use KQL on event.* for trigger conditions.',
    }),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.commentsAdded.documentation.exampleCaseFilter', {
        defaultMessage: `## Run only for Security cases
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution"'
\`\`\``,
        values: {
          triggerId: CommentsAddedTriggerId,
        },
      }),
    ],
  },
};

export const ExtendedFieldsUpdatedTriggerId = 'cases.extendedFieldsUpdated' as const;

const extendedFieldsUpdatedEventSchema = baseCaseEventSchema.extend({
  changedFields: z
    .array(z.string())
    .meta({ description: EXTENDED_FIELDS_UPDATED_TRIGGER_EVENT_SCHEMA_CHANGED_FIELDS_DESCRIPTION }),
});

export type ExtendedFieldsUpdatedPayload = z.infer<typeof extendedFieldsUpdatedEventSchema>;

export const extendedFieldsUpdatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: ExtendedFieldsUpdatedTriggerId,
  stability: 'tech_preview',
  eventSchema: extendedFieldsUpdatedEventSchema,
  title: i18n.translate('xpack.cases.workflowTriggers.extendedFieldsUpdated.title', {
    defaultMessage: 'Cases - Extended fields updated',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.extendedFieldsUpdated.description', {
    defaultMessage: 'Emitted when one or more extended-field values change on a case.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.cases.workflowTriggers.extendedFieldsUpdated.documentation.details',
      {
        defaultMessage: `Emitted after a case update changes at least one extended-field value.

**Payload fields**
- event.changedFields — sorted list of extended-field keys that changed. Use this for trigger conditions and to know which fields were affected.

**Filtering**
Filter by field key: event.changedFields: "priority_as_keyword"

**Reading current values**
Use a cases.getCase step after the trigger to read the current extended-field values.

**Mirror-driven changes**
This trigger fires when extended fields change via any write path, including a customFields patch on a field linked to a global field definition. In that case event.updatedFields on the caseUpdated trigger may only contain "customFields", not "extended_fields".

**Multi-value controls**
Values for USER_PICKER and similar multi-value controls are JSON-encoded strings (e.g. '["alice","bob"]'). Compare them in steps, not in trigger conditions.

**Self-feeding chains**
A workflow step that writes extended fields will re-emit this trigger. The chain is bounded by eventDriven.maxChainDepth (default 10). To prevent the workflow from triggering itself, add \`on.workflowEvents: ignore\` to the trigger block.`,
      }
    ),
    examples: [
      i18n.translate(
        'xpack.cases.workflowTriggers.extendedFieldsUpdated.documentation.exampleOwnerFilter',
        {
          defaultMessage: `## Run only for Security cases
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution"'
\`\`\``,
          values: { triggerId: ExtendedFieldsUpdatedTriggerId },
        }
      ),
      i18n.translate(
        'xpack.cases.workflowTriggers.extendedFieldsUpdated.documentation.exampleFieldFilter',
        {
          defaultMessage: `## Run when a specific extended field changes
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.changedFields: "{exampleKey}"'
\`\`\``,
          values: {
            triggerId: ExtendedFieldsUpdatedTriggerId,
            exampleKey: 'priority_as_keyword',
          },
        }
      ),
    ],
  },
  snippets: { condition: 'event.changedFields: "priority_as_keyword"' },
};
