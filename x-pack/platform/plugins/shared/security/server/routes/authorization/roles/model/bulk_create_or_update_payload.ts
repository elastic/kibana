/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import { getPutPayloadSchema } from './put_payload';

export function getBulkCreateOrUpdatePayloadSchema(
  getBasePrivilegeNames: () => { global: string[]; space: string[] }
) {
  return schema.object(
    {
      roles: schema.recordOf(schema.string(), getPutPayloadSchema(getBasePrivilegeNames)),
    },
    {
      meta: {
        id: 'security_roles_bulk_create_or_update_payload',
        description: 'The request body for bulk creating or updating roles.',
      },
    }
  );
}

export type BulkCreateOrUpdateRolesPayloadSchemaType = TypeOf<
  ReturnType<typeof getBulkCreateOrUpdatePayloadSchema>
>;
