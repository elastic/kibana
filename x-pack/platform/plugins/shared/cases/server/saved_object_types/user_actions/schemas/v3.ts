/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_WORKFLOW_ORIGIN_TYPE_LENGTH,
} from '../../../../common/constants';
import { payloadSchema as payloadSchemaV1 } from './v1';
import {
  userActionCreateSchema as userActionCreateSchemaV2,
  userActionForwardCompatibilitySchema as userActionForwardCompatibilitySchemaV2,
} from './v2';

// `type` is a plain string rather than a closed `oneOf` of the workflow origin types, so a node
// on this version can still read a document written by a future model version that adds a new
// origin type, instead of throwing on the unknown literal.
const originSchema = schema.object(
  {
    type: schema.string({ maxLength: MAX_WORKFLOW_ORIGIN_TYPE_LENGTH }),
    attachmentType: schema.maybe(schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })),
  },
  { unknowns: 'allow' }
);

const payloadSchema = payloadSchemaV1.extends({
  origin: schema.maybe(originSchema),
});

export const userActionCreateSchema = userActionCreateSchemaV2.extends({
  payload: schema.maybe(payloadSchema),
});

export const userActionForwardCompatibilitySchema = userActionForwardCompatibilitySchemaV2.extends({
  payload: schema.maybe(payloadSchema),
});
