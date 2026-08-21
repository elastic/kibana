/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { ENROLLMENT_API_KEY_MAPPINGS } from '../../constants';

import { FLEET_ENROLLMENT_API_PREFIX } from '../../../common/constants';
import { isValidEnrollmentKeyExpiration } from '../../../common/services';

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
};

export const DeleteEnrollmentAPIKeyResponseSchema = schema.object({
  action: schema.literal('deleted'),
});

export const PostEnrollmentAPIKeyRequestSchema = {
  body: schema.object(
    {
      name: schema.maybe(schema.string()),
      policy_id: schema.string(),
      expiration: schema.maybe(
        schema.string({
          maxLength: 20,
          meta: {
            description:
              'The expiration time for the enrollment token, expressed as a duration (for example, 30d, 24h, 90m). By default, enrollment tokens never expire.',
          },
          validate: (value) => {
            if (!isValidEnrollmentKeyExpiration(value)) {
              return 'Expiration must be a valid duration (for example, 30d, 24h, 90m, 60s)';
            }
          },
        })
      ),
    },
    { meta: { id: 'new_enrollment_api_key' } }
  ),
};
