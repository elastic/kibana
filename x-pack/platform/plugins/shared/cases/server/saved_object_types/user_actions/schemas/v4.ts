/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_ATTACHMENT_ID_LENGTH, MAX_ATTACHMENT_TYPE_LENGTH } from '../../../../common/constants';
import {
  payloadSchema as payloadSchemaV3,
  userActionCreateSchema as userActionCreateSchemaV3,
  userActionForwardCompatibilitySchema as userActionForwardCompatibilitySchemaV3,
} from './v3';

const commentSchema = schema.object(
  {
    type: schema.maybe(schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })),
    externalReferenceAttachmentTypeId: schema.maybe(
      schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })
    ),
    persistableStateAttachmentTypeId: schema.maybe(
      schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })
    ),
    parent_id: schema.maybe(
      schema.nullable(schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }))
    ),
  },
  { unknowns: 'allow' }
);

const payloadSchema = payloadSchemaV3.extends({
  comment: schema.maybe(commentSchema),
});

export const userActionCreateSchema = userActionCreateSchemaV3.extends({
  payload: schema.maybe(payloadSchema),
});

export const userActionForwardCompatibilitySchema = userActionForwardCompatibilitySchemaV3.extends({
  payload: schema.maybe(payloadSchema),
});
