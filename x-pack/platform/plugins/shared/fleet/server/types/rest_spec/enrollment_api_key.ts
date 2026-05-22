/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { ENROLLMENT_API_KEY_MAPPINGS } from '../../constants';

import { FLEET_ENROLLMENT_API_PREFIX } from '../../../common/constants';

import { validateKuery } from '../../routes/utils/filter_utils';
import { EnrollmentAPIKeySchema } from '../models';

export const GetEnrollmentAPIKeysRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 1, meta: { description: 'Page number' } }),
    perPage: schema.number({
      defaultValue: 20,
      meta: { description: 'Number of results per page' },
    }),
    kuery: schema.maybe(
      schema.string({
        meta: { description: 'A KQL query string to filter results' },
        validate: (value: string) => {
          const validationObj = validateKuery(
            value,
            [FLEET_ENROLLMENT_API_PREFIX],
            ENROLLMENT_API_KEY_MAPPINGS,
            true
          );
          if (validationObj?.error) {
            return validationObj?.error;
          }
        },
      })
    ),
  }),
};

export const GetOneEnrollmentAPIKeyRequestSchema = {
  params: schema.object({
    keyId: schema.string({ meta: { description: 'The ID of the enrollment API key' } }),
  }),
};

export const EnrollmentAPIKeyResponseSchema = schema.object({
  item: EnrollmentAPIKeySchema,
});

export const DeleteEnrollmentAPIKeyRequestSchema = {
  params: schema.object({
    keyId: schema.string({ meta: { description: 'The ID of the enrollment API key' } }),
  }),
  query: schema.object({
    forceDelete: schema.boolean({
      defaultValue: false,
      meta: {
        description:
          'When false (default), invalidate the API key and mark the token as inactive. When true, also delete the token document.',
      },
    }),
    includeHidden: schema.boolean({
      defaultValue: false,
      meta: {
        description:
          'When true, allow deletion of hidden enrollment tokens (managed/agentless policies). Defaults to false.',
      },
    }),
  }),
};

export const DeleteEnrollmentAPIKeyResponseSchema = schema.object({
  action: schema.literal('deleted'),
});

export const PostEnrollmentAPIKeyRequestSchema = {
  body: schema.object({
    name: schema.maybe(schema.string()),
    policy_id: schema.string(),
    expiration: schema.maybe(schema.string()),
  }),
};

export const BulkDeleteEnrollmentAPIKeysRequestSchema = {
  body: schema.object(
    {
      tokenIds: schema.maybe(
        schema.arrayOf(schema.string(), {
          maxSize: 10000,
          meta: { description: 'List of enrollment token IDs to delete.' },
        })
      ),
      kuery: schema.maybe(
        schema.string({
          meta: { description: 'KQL query to select enrollment tokens to delete.' },
          validate: (value: string) => {
            const validationObj = validateKuery(
              value,
              [FLEET_ENROLLMENT_API_PREFIX],
              ENROLLMENT_API_KEY_MAPPINGS,
              true
            );
            if (validationObj?.error) {
              return validationObj?.error;
            }
          },
        })
      ),
      forceDelete: schema.boolean({
        defaultValue: false,
        meta: {
          description:
            'When false (default), invalidate the API key and mark the token as inactive. When true, also delete the token document.',
        },
      }),
      includeHidden: schema.boolean({
        defaultValue: false,
        meta: {
          description:
            'When true, allow deletion of hidden enrollment tokens (managed/agentless policies). Defaults to false.',
        },
      }),
    },
    {
      validate: (value) => {
        const hasTokenIds = value.tokenIds && value.tokenIds.length > 0;
        const hasKuery = value.kuery && value.kuery.trim() !== '';
        if (!hasTokenIds && !hasKuery) {
          return 'Either tokenIds or kuery must be provided';
        }
      },
    }
  ),
};

export const BulkDeleteEnrollmentAPIKeysResponseSchema = schema.object({
  action: schema.string(),
  count: schema.number(),
  successCount: schema.number(),
  errorCount: schema.number(),
});
