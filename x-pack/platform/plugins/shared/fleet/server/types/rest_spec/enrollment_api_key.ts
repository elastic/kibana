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
    page: schema.number({ defaultValue: 1 }),
    perPage: schema.number({ defaultValue: 20 }),
    kuery: schema.maybe(
      schema.string({
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
    keyId: schema.string(),
  }),
};

export const EnrollmentAPIKeyResponseSchema = schema.object({
  item: EnrollmentAPIKeySchema,
});

export const DeleteEnrollmentAPIKeyRequestSchema = {
  params: schema.object({
    keyId: schema.string(),
  }),
  query: schema.object({
    forceDelete: schema.boolean({ defaultValue: false }),
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
      tokenIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10000 })),
      kuery: schema.maybe(
        schema.string({
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
      forceDelete: schema.boolean({ defaultValue: false }),
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
