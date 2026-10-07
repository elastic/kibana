/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_ISO_DATE_LENGTH,
  MAX_OWNER_LENGTH,
  MAX_USER_ACTION_TYPE_LENGTH,
  MAX_USERNAME_LENGTH,
} from '../../../../common/constants';

const userSchema = schema.object(
  {
    username: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_USERNAME_LENGTH }))),
  },
  { unknowns: 'allow' }
);

const payloadSchema = schema.object(
  {
    connector: schema.maybe(
      schema.object(
        {
          type: schema.maybe(schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })),
        },
        { unknowns: 'allow' }
      )
    ),
    comment: schema.maybe(
      schema.object(
        {
          type: schema.maybe(schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })),
          externalReferenceAttachmentTypeId: schema.maybe(
            schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })
          ),
          persistableStateAttachmentTypeId: schema.maybe(
            schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH })
          ),
        },
        { unknowns: 'allow' }
      )
    ),
    assignees: schema.maybe(
      schema.arrayOf(
        schema.object(
          {
            uid: schema.maybe(schema.string({ maxLength: MAX_USERNAME_LENGTH })),
          },
          { unknowns: 'allow' }
        )
      )
    ),
  },
  { unknowns: 'allow' }
);

/**
 * Baseline schema for the indexed user-action fields. The SO mapping is
 * `dynamic: false`, so only these paths are indexed. `unknowns: 'allow'`
 * keeps the unmapped payload union (and other stored attributes) valid.
 */
export const userActionCreateSchema = schema.object(
  {
    action: schema.string({ maxLength: MAX_USER_ACTION_TYPE_LENGTH }),
    created_at: schema.string({ maxLength: MAX_ISO_DATE_LENGTH }),
    created_by: userSchema,
    payload: schema.maybe(payloadSchema),
    owner: schema.string({ maxLength: MAX_OWNER_LENGTH }),
    type: schema.string({ maxLength: MAX_USER_ACTION_TYPE_LENGTH }),
  },
  { unknowns: 'allow' }
);
