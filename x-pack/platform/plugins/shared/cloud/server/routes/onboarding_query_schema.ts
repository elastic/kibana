/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_CLOUD_DEPLOYMENT_ID_LENGTH,
  MAX_CLOUD_DEPLOYMENT_NAME_LENGTH,
  MAX_CLOUD_ONBOARDING_NEXT_LENGTH,
  MAX_CLOUD_ONBOARDING_TOKEN_LENGTH,
} from '../route_length_limits';

export const cloudOnboardingQuerySchema = schema.maybe(
  schema.object(
    {
      next: schema.maybe(schema.string({ maxLength: MAX_CLOUD_ONBOARDING_NEXT_LENGTH })),
      onboarding_token: schema.maybe(
        schema.string({ maxLength: MAX_CLOUD_ONBOARDING_TOKEN_LENGTH })
      ),
      security: schema.maybe(
        schema.object({
          use_case: schema.oneOf([
            schema.literal('siem'),
            schema.literal('cloud'),
            schema.literal('edr'),
            schema.literal('other'),
          ]),
          migration: schema.maybe(
            schema.object({
              value: schema.boolean(),
              type: schema.maybe(schema.oneOf([schema.literal('splunk'), schema.literal('other')])),
            })
          ),
        })
      ),
      resource_data: schema.maybe(
        schema.object({
          project: schema.maybe(
            schema.object({
              search: schema.maybe(
                schema.object({
                  type: schema.oneOf([
                    schema.literal('general'),
                    schema.literal('vector'),
                    schema.literal('timeseries'),
                  ]),
                })
              ),
            })
          ),
          deployment: schema.maybe(
            schema.object({
              id: schema.maybe(schema.string({ maxLength: MAX_CLOUD_DEPLOYMENT_ID_LENGTH })),
              name: schema.maybe(schema.string({ maxLength: MAX_CLOUD_DEPLOYMENT_NAME_LENGTH })),
            })
          ),
        })
      ),
    },
    { unknowns: 'ignore' }
  )
);
