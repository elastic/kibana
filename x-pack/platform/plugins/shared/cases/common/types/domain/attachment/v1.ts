/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { limitedStringSchema, mimeTypeString, jsonValueSchema } from '../../../schema';
import { UserSchema } from '../user/v1';
import {
  MAX_COMMENT_LENGTH,
  MAX_FILENAME_LENGTH,
  MAX_RULE_NAME_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../constants';

export enum AttachmentType {
  actions = 'actions',
  alert = 'alert',
  event = 'event',
  externalReference = 'externalReference',
  persistableState = 'persistableState',
  user = 'user',
}

export enum ExternalReferenceStorageType {
  savedObject = 'savedObject',
  elasticSearchDoc = 'elasticSearchDoc',
}

/**
 * Files
 */
export const SingleFileAttachmentMetadataSchema = z.object({
  name: z.string().max(MAX_FILENAME_LENGTH),
  extension: z.string().max(10),
  mimeType: z.string().max(100),
  created: z.string().max(30),
});

export const FileAttachmentMetadataSchema = z.object({
  files: z.array(SingleFileAttachmentMetadataSchema),
});

export type FileAttachmentMetadata = z.infer<typeof FileAttachmentMetadataSchema>;

export const AttachmentAttributesBasicSchema = z.object({
  created_at: z.string().max(30),
  created_by: UserSchema,
  owner: z.string().max(MAX_TITLE_LENGTH),
  pushed_at: z.string().max(30).nullable(),
  pushed_by: UserSchema.nullable(),
  updated_at: z.string().max(30).nullable(),
  updated_by: UserSchema.nullable(),
});

export const FileAttachmentMetadataPayloadSchema = z.object({
  mimeType: mimeTypeString,
  filename: limitedStringSchema({ fieldName: 'filename', min: 1, max: MAX_FILENAME_LENGTH }),
});

/**
 * User comment
 */
export const UserCommentAttachmentPayloadSchema = z.object({
  comment: z.string().max(MAX_COMMENT_LENGTH),
  type: z.literal(AttachmentType.user),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

const UserCommentAttachmentAttributesSchema = UserCommentAttachmentPayloadSchema.merge(
  AttachmentAttributesBasicSchema
);

export const UserCommentAttachmentSchema = UserCommentAttachmentAttributesSchema.extend({
  id: z.string().max(512),
  version: z.string().max(512),
});

export type UserCommentAttachmentPayload = z.infer<typeof UserCommentAttachmentPayloadSchema>;
export type UserCommentAttachmentAttributes = z.infer<typeof UserCommentAttachmentAttributesSchema>;
export type UserCommentAttachment = z.infer<typeof UserCommentAttachmentSchema>;

/**
 * Generic event
 */
export const EventAttachmentPayloadSchema = z.object({
  type: z.literal(AttachmentType.event),
  eventId: z.union([z.array(z.string().max(MAX_TITLE_LENGTH)), z.string().max(MAX_TITLE_LENGTH)]),
  index: z.union([z.array(z.string().max(MAX_TITLE_LENGTH)), z.string().max(MAX_TITLE_LENGTH)]),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

/**
 * Alerts
 */
export const AlertAttachmentPayloadSchema = z.object({
  type: z.literal(AttachmentType.alert),
  alertId: z.union([z.array(z.string().max(MAX_TITLE_LENGTH)), z.string().max(MAX_TITLE_LENGTH)]),
  index: z.union([z.array(z.string().max(MAX_TITLE_LENGTH)), z.string().max(MAX_TITLE_LENGTH)]),
  rule: z.object({
    id: z.string().max(MAX_TITLE_LENGTH).nullable(),
    name: z.string().max(MAX_RULE_NAME_LENGTH).nullable(),
  }),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

export const AlertAttachmentAttributesSchema = AlertAttachmentPayloadSchema.merge(
  AttachmentAttributesBasicSchema
);

export const EventAttachmentAttributesSchema = EventAttachmentPayloadSchema.merge(
  AttachmentAttributesBasicSchema
);

export const AlertAttachmentSchema = AlertAttachmentAttributesSchema.extend({
  id: z.string().max(512),
  version: z.string().max(512),
});

export const EventAttachmentSchema = EventAttachmentAttributesSchema.extend({
  id: z.string().max(512),
  version: z.string().max(512),
});

export type AlertAttachmentPayload = z.infer<typeof AlertAttachmentPayloadSchema>;
export type AlertAttachmentAttributes = z.infer<typeof AlertAttachmentAttributesSchema>;
export type AlertAttachment = z.infer<typeof AlertAttachmentSchema>;

export type EventAttachmentPayload = z.infer<typeof EventAttachmentPayloadSchema>;
export type EventAttachmentAttributes = z.infer<typeof EventAttachmentAttributesSchema>;
export type EventAttachment = z.infer<typeof EventAttachmentSchema>;

export const DocumentAttachmentAttributesSchema = z.union([
  AlertAttachmentAttributesSchema,
  EventAttachmentAttributesSchema,
]);
export type DocumentAttachmentAttributes = z.infer<typeof DocumentAttachmentAttributesSchema>;

/**
 * Actions
 */
export enum IsolateHostActionType {
  isolate = 'isolate',
  unisolate = 'unisolate',
}

export const ActionsAttachmentPayloadSchema = z.object({
  type: z.literal(AttachmentType.actions),
  comment: z.string().max(MAX_COMMENT_LENGTH),
  actions: z.object({
    targets: z.array(
      z.object({
        hostname: z.string().max(256),
        endpointId: z.string().max(MAX_TITLE_LENGTH),
      })
    ),
    type: z.string().max(MAX_TITLE_LENGTH),
  }),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

const ActionsAttachmentAttributesSchema = ActionsAttachmentPayloadSchema.merge(
  AttachmentAttributesBasicSchema
);

export const ActionsAttachmentSchema = ActionsAttachmentAttributesSchema.extend({
  id: z.string().max(512),
  version: z.string().max(512),
});

export type ActionsAttachmentPayload = z.infer<typeof ActionsAttachmentPayloadSchema>;
export type ActionsAttachmentAttributes = z.infer<typeof ActionsAttachmentAttributesSchema>;
export type ActionsAttachment = z.infer<typeof ActionsAttachmentSchema>;

/**
 * External reference
 */
const ExternalReferenceStorageNoSOSchema = z.object({
  type: z.literal(ExternalReferenceStorageType.elasticSearchDoc),
});

const ExternalReferenceStorageSOSchema = z.object({
  type: z.literal(ExternalReferenceStorageType.savedObject),
  soType: z.string().max(MAX_TITLE_LENGTH),
});

const ExternalReferenceBaseAttachmentPayloadSchema = z.object({
  externalReferenceAttachmentTypeId: z.string().max(MAX_TITLE_LENGTH),
  externalReferenceMetadata: z.record(z.string().max(MAX_TITLE_LENGTH), jsonValueSchema).nullable(),
  type: z.literal(AttachmentType.externalReference),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

export const ExternalReferenceNoSOAttachmentPayloadSchema =
  ExternalReferenceBaseAttachmentPayloadSchema.extend({
    externalReferenceId: z.string().max(MAX_TITLE_LENGTH),
    externalReferenceStorage: ExternalReferenceStorageNoSOSchema,
  });

export const ExternalReferenceSOAttachmentPayloadSchema =
  ExternalReferenceBaseAttachmentPayloadSchema.extend({
    externalReferenceId: z.string().max(MAX_TITLE_LENGTH),
    externalReferenceStorage: ExternalReferenceStorageSOSchema,
  });

export const ExternalReferenceSOWithoutRefsAttachmentPayloadSchema =
  ExternalReferenceBaseAttachmentPayloadSchema.extend({
    externalReferenceStorage: ExternalReferenceStorageSOSchema,
  });

export const ExternalReferenceAttachmentPayloadSchema = z.union([
  ExternalReferenceNoSOAttachmentPayloadSchema,
  ExternalReferenceSOAttachmentPayloadSchema,
]);

export const ExternalReferenceWithoutRefsAttachmentPayloadSchema = z.union([
  ExternalReferenceNoSOAttachmentPayloadSchema,
  ExternalReferenceSOWithoutRefsAttachmentPayloadSchema,
]);

const ExternalReferenceAttachmentAttributesSchema = ExternalReferenceAttachmentPayloadSchema.and(
  AttachmentAttributesBasicSchema
);

const ExternalReferenceWithoutRefsAttachmentAttributesSchema =
  ExternalReferenceWithoutRefsAttachmentPayloadSchema.and(AttachmentAttributesBasicSchema);

const ExternalReferenceNoSOAttachmentAttributesSchema =
  ExternalReferenceNoSOAttachmentPayloadSchema.merge(AttachmentAttributesBasicSchema);

const ExternalReferenceSOAttachmentAttributesSchema =
  ExternalReferenceSOAttachmentPayloadSchema.merge(AttachmentAttributesBasicSchema);

export const ExternalReferenceAttachmentSchema = ExternalReferenceAttachmentAttributesSchema.and(
  z.object({ id: z.string().max(512), version: z.string().max(512) })
);

export type ExternalReferenceAttachmentPayload = z.infer<
  typeof ExternalReferenceAttachmentPayloadSchema
>;
export type ExternalReferenceSOAttachmentPayload = z.infer<
  typeof ExternalReferenceSOAttachmentPayloadSchema
>;
export type ExternalReferenceNoSOAttachmentPayload = z.infer<
  typeof ExternalReferenceNoSOAttachmentPayloadSchema
>;
export type ExternalReferenceAttachmentAttributes = z.infer<
  typeof ExternalReferenceAttachmentAttributesSchema
>;
export type ExternalReferenceSOAttachmentAttributes = z.infer<
  typeof ExternalReferenceSOAttachmentAttributesSchema
>;
export type ExternalReferenceNoSOAttachmentAttributes = z.infer<
  typeof ExternalReferenceNoSOAttachmentAttributesSchema
>;
export type ExternalReferenceWithoutRefsAttachmentPayload = z.infer<
  typeof ExternalReferenceWithoutRefsAttachmentPayloadSchema
>;
export type ExternalReferenceAttachment = z.infer<typeof ExternalReferenceAttachmentSchema>;

/**
 * Persistable state
 */
export const PersistableStateAttachmentPayloadSchema = z.object({
  type: z.literal(AttachmentType.persistableState),
  owner: z.string().max(MAX_TITLE_LENGTH),
  persistableStateAttachmentTypeId: z.string().max(MAX_TITLE_LENGTH),
  persistableStateAttachmentState: z.record(z.string().max(MAX_TITLE_LENGTH), jsonValueSchema),
});

const PersistableStateAttachmentAttributesSchema = PersistableStateAttachmentPayloadSchema.merge(
  AttachmentAttributesBasicSchema
);

export const PersistableStateAttachmentSchema = PersistableStateAttachmentAttributesSchema.extend({
  id: z.string().max(512),
  version: z.string().max(512),
});

export type PersistableStateAttachmentPayload = z.infer<
  typeof PersistableStateAttachmentPayloadSchema
>;
export type PersistableStateAttachment = z.infer<typeof PersistableStateAttachmentSchema>;
export type PersistableStateAttachmentAttributes = z.infer<
  typeof PersistableStateAttachmentAttributesSchema
>;

/**
 * Common
 */
export const AttachmentPayloadSchema = z.union([
  UserCommentAttachmentPayloadSchema,
  AlertAttachmentPayloadSchema,
  EventAttachmentPayloadSchema,
  ActionsAttachmentPayloadSchema,
  ExternalReferenceNoSOAttachmentPayloadSchema,
  ExternalReferenceSOAttachmentPayloadSchema,
  PersistableStateAttachmentPayloadSchema,
]);

export const AttachmentAttributesSchema = z.union([
  UserCommentAttachmentAttributesSchema,
  AlertAttachmentAttributesSchema,
  EventAttachmentAttributesSchema,
  ActionsAttachmentAttributesSchema,
  ExternalReferenceAttachmentAttributesSchema,
  PersistableStateAttachmentAttributesSchema,
]);

const AttachmentAttributesNoSOSchema = z.union([
  UserCommentAttachmentAttributesSchema,
  AlertAttachmentAttributesSchema,
  EventAttachmentAttributesSchema,
  ActionsAttachmentAttributesSchema,
  ExternalReferenceNoSOAttachmentAttributesSchema,
  PersistableStateAttachmentAttributesSchema,
]);

const AttachmentAttributesWithoutRefsSchema = z.union([
  UserCommentAttachmentAttributesSchema,
  AlertAttachmentAttributesSchema,
  EventAttachmentAttributesSchema,
  ActionsAttachmentAttributesSchema,
  ExternalReferenceWithoutRefsAttachmentAttributesSchema,
  PersistableStateAttachmentAttributesSchema,
]);

export const AttachmentSchema = AttachmentAttributesSchema.and(
  z.object({ id: z.string().max(512), version: z.string().max(512) })
);

export const AttachmentsSchema = z.array(AttachmentSchema);

/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
export const AttachmentPatchAttributesSchema = z
  .union([
    UserCommentAttachmentPayloadSchema.partial(),
    AlertAttachmentPayloadSchema.partial(),
    EventAttachmentPayloadSchema.partial(),
    ActionsAttachmentPayloadSchema.partial(),
    ExternalReferenceNoSOAttachmentPayloadSchema.partial(),
    ExternalReferenceSOAttachmentPayloadSchema.partial(),
    PersistableStateAttachmentPayloadSchema.partial(),
  ])
  .and(AttachmentAttributesBasicSchema.partial());

export type AttachmentAttributes = z.infer<typeof AttachmentAttributesSchema>;
export type AttachmentAttributesNoSO = z.infer<typeof AttachmentAttributesNoSOSchema>;
export type AttachmentAttributesWithoutRefs = z.infer<typeof AttachmentAttributesWithoutRefsSchema>;
export type AttachmentPatchAttributes = z.infer<typeof AttachmentPatchAttributesSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Attachments = z.infer<typeof AttachmentsSchema>;
