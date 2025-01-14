/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { limitedStringSchema, mimeTypeString } from '../../../schema';
import { jsonValueRt } from '../../../api';
import { UserRt } from '../user/v1';
import { MAX_FILENAME_LENGTH } from '../../../constants';

/**
 * Files
 */
export const SingleFileAttachmentMetadataRt = rt.strict({
  name: rt.string,
  extension: rt.string,
  mimeType: rt.string,
  created: rt.string,
});

export const FileAttachmentMetadataRt = rt.strict({
  files: rt.array(SingleFileAttachmentMetadataRt),
});

export type FileAttachmentMetadata = rt.TypeOf<typeof FileAttachmentMetadataRt>;

export const AttachmentAttributesBasicRt = rt.strict({
  created_at: rt.string,
  created_by: UserRt,
  owner: rt.string,
  pushed_at: rt.union([rt.string, rt.null]),
  pushed_by: rt.union([UserRt, rt.null]),
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRt, rt.null]),
});

export const FileAttachmentMetadataPayloadRt = rt.strict({
  mimeType: mimeTypeString,
  filename: limitedStringSchema({ fieldName: 'filename', min: 1, max: MAX_FILENAME_LENGTH }),
});

/**
 * User comment
 */

export enum AttachmentType {
  user = 'user',
  alert = 'alert',
  actions = 'actions',
  externalReference = 'externalReference',
  persistableState = 'persistableState',
}

export const UserCommentAttachmentPayloadRt = rt.strict({
  comment: rt.string,
  type: rt.literal(AttachmentType.user),
  owner: rt.string,
});

const UserCommentAttachmentAttributesRt = rt.intersection([
  UserCommentAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

export const UserCommentAttachmentRt = rt.intersection([
  UserCommentAttachmentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export type UserCommentAttachmentPayload = rt.TypeOf<typeof UserCommentAttachmentPayloadRt>;
export type UserCommentAttachmentAttributes = rt.TypeOf<typeof UserCommentAttachmentAttributesRt>;
export type UserCommentAttachment = rt.TypeOf<typeof UserCommentAttachmentRt>;

/**
 * Alerts
 */

export const AlertAttachmentPayloadRt = rt.strict({
  type: rt.literal(AttachmentType.alert),
  alertId: rt.union([rt.array(rt.string), rt.string]),
  index: rt.union([rt.array(rt.string), rt.string]),
  rule: rt.strict({
    id: rt.union([rt.string, rt.null]),
    name: rt.union([rt.string, rt.null]),
  }),
  owner: rt.string,
});

export const AlertAttachmentAttributesRt = rt.intersection([
  AlertAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

export const AlertAttachmentRt = rt.intersection([
  AlertAttachmentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export type AlertAttachmentPayload = rt.TypeOf<typeof AlertAttachmentPayloadRt>;
export type AlertAttachmentAttributes = rt.TypeOf<typeof AlertAttachmentAttributesRt>;
export type AlertAttachment = rt.TypeOf<typeof AlertAttachmentRt>;

/**
 * Actions
 */

export enum IsolateHostActionType {
  isolate = 'isolate',
  unisolate = 'unisolate',
}

export const ActionsAttachmentPayloadRt = rt.strict({
  type: rt.literal(AttachmentType.actions),
  comment: rt.string,
  actions: rt.strict({
    targets: rt.array(
      rt.strict({
        hostname: rt.string,
        endpointId: rt.string,
      })
    ),
    type: rt.string,
  }),
  owner: rt.string,
});

const ActionsAttachmentAttributesRt = rt.intersection([
  ActionsAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

export const ActionsAttachmentRt = rt.intersection([
  ActionsAttachmentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export type ActionsAttachmentPayload = rt.TypeOf<typeof ActionsAttachmentPayloadRt>;
export type ActionsAttachmentAttributes = rt.TypeOf<typeof ActionsAttachmentAttributesRt>;
export type ActionsAttachment = rt.TypeOf<typeof ActionsAttachmentRt>;

/**
 * External reference
 */

export enum ExternalReferenceStorageType {
  savedObject = 'savedObject',
  elasticSearchDoc = 'elasticSearchDoc',
}

const ExternalReferenceStorageNoSORt = rt.strict({
  type: rt.literal(ExternalReferenceStorageType.elasticSearchDoc),
});

const ExternalReferenceStorageSORt = rt.strict({
  type: rt.literal(ExternalReferenceStorageType.savedObject),
  soType: rt.string,
});

const ExternalReferenceBaseAttachmentPayloadRt = rt.strict({
  externalReferenceAttachmentTypeId: rt.string,
  externalReferenceMetadata: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
  type: rt.literal(AttachmentType.externalReference),
  owner: rt.string,
});

export const ExternalReferenceNoSOAttachmentPayloadRt = rt.strict({
  ...ExternalReferenceBaseAttachmentPayloadRt.type.props,
  externalReferenceId: rt.string,
  externalReferenceStorage: ExternalReferenceStorageNoSORt,
});

export const ExternalReferenceSOAttachmentPayloadRt = rt.strict({
  ...ExternalReferenceBaseAttachmentPayloadRt.type.props,
  externalReferenceId: rt.string,
  externalReferenceStorage: ExternalReferenceStorageSORt,
});

// externalReferenceId is missing.
export const ExternalReferenceSOWithoutRefsAttachmentPayloadRt = rt.strict({
  ...ExternalReferenceBaseAttachmentPayloadRt.type.props,
  externalReferenceStorage: ExternalReferenceStorageSORt,
});

export const ExternalReferenceAttachmentPayloadRt = rt.union([
  ExternalReferenceNoSOAttachmentPayloadRt,
  ExternalReferenceSOAttachmentPayloadRt,
]);

export const ExternalReferenceWithoutRefsAttachmentPayloadRt = rt.union([
  ExternalReferenceNoSOAttachmentPayloadRt,
  ExternalReferenceSOWithoutRefsAttachmentPayloadRt,
]);

const ExternalReferenceAttachmentAttributesRt = rt.intersection([
  ExternalReferenceAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

const ExternalReferenceWithoutRefsAttachmentAttributesRt = rt.intersection([
  ExternalReferenceWithoutRefsAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

const ExternalReferenceNoSOAttachmentAttributesRt = rt.intersection([
  ExternalReferenceNoSOAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

const ExternalReferenceSOAttachmentAttributesRt = rt.intersection([
  ExternalReferenceSOAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

export const ExternalReferenceAttachmentRt = rt.intersection([
  ExternalReferenceAttachmentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export type ExternalReferenceAttachmentPayload = rt.TypeOf<
  typeof ExternalReferenceAttachmentPayloadRt
>;

export type ExternalReferenceSOAttachmentPayload = rt.TypeOf<
  typeof ExternalReferenceSOAttachmentPayloadRt
>;
export type ExternalReferenceNoSOAttachmentPayload = rt.TypeOf<
  typeof ExternalReferenceNoSOAttachmentPayloadRt
>;

export type ExternalReferenceAttachmentAttributes = rt.TypeOf<
  typeof ExternalReferenceAttachmentAttributesRt
>;

export type ExternalReferenceSOAttachmentAttributes = rt.TypeOf<
  typeof ExternalReferenceSOAttachmentAttributesRt
>;

export type ExternalReferenceNoSOAttachmentAttributes = rt.TypeOf<
  typeof ExternalReferenceNoSOAttachmentAttributesRt
>;

export type ExternalReferenceWithoutRefsAttachmentPayload = rt.TypeOf<
  typeof ExternalReferenceWithoutRefsAttachmentPayloadRt
>;
export type ExternalReferenceAttachment = rt.TypeOf<typeof ExternalReferenceAttachmentRt>;

/**
 * Persistable state
 */

export const PersistableStateAttachmentPayloadRt = rt.strict({
  type: rt.literal(AttachmentType.persistableState),
  owner: rt.string,
  persistableStateAttachmentTypeId: rt.string,
  persistableStateAttachmentState: rt.record(rt.string, jsonValueRt),
});

const PersistableStateAttachmentAttributesRt = rt.intersection([
  PersistableStateAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
]);

export const PersistableStateAttachmentRt = rt.intersection([
  PersistableStateAttachmentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export type PersistableStateAttachmentPayload = rt.TypeOf<
  typeof PersistableStateAttachmentPayloadRt
>;
export type PersistableStateAttachment = rt.TypeOf<typeof PersistableStateAttachmentRt>;
export type PersistableStateAttachmentAttributes = rt.TypeOf<
  typeof PersistableStateAttachmentAttributesRt
>;

/**
 * Common
 */

export const AttachmentAttributesRt = rt.union([
  UserCommentAttachmentAttributesRt,
  AlertAttachmentAttributesRt,
  ActionsAttachmentAttributesRt,
  ExternalReferenceAttachmentAttributesRt,
  PersistableStateAttachmentAttributesRt,
]);

const AttachmentAttributesNoSORt = rt.union([
  UserCommentAttachmentAttributesRt,
  AlertAttachmentAttributesRt,
  ActionsAttachmentAttributesRt,
  ExternalReferenceNoSOAttachmentAttributesRt,
  PersistableStateAttachmentAttributesRt,
]);

const AttachmentAttributesWithoutRefsRt = rt.union([
  UserCommentAttachmentAttributesRt,
  AlertAttachmentAttributesRt,
  ActionsAttachmentAttributesRt,
  ExternalReferenceWithoutRefsAttachmentAttributesRt,
  PersistableStateAttachmentAttributesRt,
]);

export const AttachmentRt = rt.intersection([
  AttachmentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export const AttachmentsRt = rt.array(AttachmentRt);

/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
export const AttachmentPatchAttributesRt = rt.intersection([
  rt.union([
    rt.exact(rt.partial(UserCommentAttachmentPayloadRt.type.props)),
    rt.exact(rt.partial(AlertAttachmentPayloadRt.type.props)),
    rt.exact(rt.partial(ActionsAttachmentPayloadRt.type.props)),
    rt.exact(rt.partial(ExternalReferenceNoSOAttachmentPayloadRt.type.props)),
    rt.exact(rt.partial(ExternalReferenceSOAttachmentPayloadRt.type.props)),
    rt.exact(rt.partial(PersistableStateAttachmentPayloadRt.type.props)),
  ]),
  rt.exact(rt.partial(AttachmentAttributesBasicRt.type.props)),
]);

export type AttachmentAttributes = rt.TypeOf<typeof AttachmentAttributesRt>;
export type AttachmentAttributesNoSO = rt.TypeOf<typeof AttachmentAttributesNoSORt>;
export type AttachmentAttributesWithoutRefs = rt.TypeOf<typeof AttachmentAttributesWithoutRefsRt>;
export type AttachmentPatchAttributes = rt.TypeOf<typeof AttachmentPatchAttributesRt>;
export type Attachment = rt.TypeOf<typeof AttachmentRt>;
export type Attachments = rt.TypeOf<typeof AttachmentsRt>;
