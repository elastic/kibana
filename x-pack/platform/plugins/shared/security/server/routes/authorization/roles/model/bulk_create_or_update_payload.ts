/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import { getPutPayloadSchema } from './put_payload';

export const MAX_BULK_ROLES = 100;
const MAX_ROLE_NAME_LENGTH = 1024;

export function getBulkCreateOrUpdatePayloadSchema(
  getBasePrivilegeNames: () => { global: string[]; space: string[] }
) {
  return schema.object(
    {
      roles: schema.recordOf(
        schema.string({ minLength: 1, maxLength: MAX_ROLE_NAME_LENGTH }),
        getPutPayloadSchema(getBasePrivilegeNames),
        {
          validate: (roles) => {
            if (Object.keys(roles).length > MAX_BULK_ROLES) {
              return `cannot contain more than ${MAX_BULK_ROLES} roles`;
            }
          },
        }
      ),
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
