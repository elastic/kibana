/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_ACTION_SOURCE_ID_LENGTH,
  MAX_ACTION_SOURCE_NAME_LENGTH,
  MAX_ACTION_SOURCE_RUN_ID_LENGTH,
} from '../../../../common/constants';
import { userActionCreateSchema as userActionCreateSchemaV1 } from './v1';

const sourceSchema = schema.object(
  {
    // Keep in sync with `ActionSourceTypes` in `common/types/domain/user_action/source`.
    type: schema.oneOf([
      schema.literal('agent'),
      schema.literal('workflow'),
      schema.literal('rule'),
      schema.literal('attack'),
      schema.literal('api'),
      schema.literal('user'),
    ]),
    id: schema.string({ maxLength: MAX_ACTION_SOURCE_ID_LENGTH }),
    name: schema.maybe(schema.string({ maxLength: MAX_ACTION_SOURCE_NAME_LENGTH })),
    run_id: schema.maybe(schema.string({ maxLength: MAX_ACTION_SOURCE_RUN_ID_LENGTH })),
  },
  { unknowns: 'allow' }
);

export const userActionCreateSchema = userActionCreateSchemaV1.extends(
  {
    source: schema.maybe(schema.nullable(sourceSchema)),
  },
  { unknowns: 'allow' }
);
