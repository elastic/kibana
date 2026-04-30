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
