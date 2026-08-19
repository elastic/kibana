/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_CLOUD_DEPLOYMENT_ID_LENGTH,
  MAX_CLOUD_DEPLOYMENT_NAME_LENGTH,
  MAX_CLOUD_ONBOARDING_NEXT_LENGTH,
  MAX_CLOUD_ONBOARDING_TOKEN_LENGTH,
} from '../route_length_limits';
import { cloudOnboardingQuerySchema } from './onboarding_query_schema';

describe('cloudOnboardingQuerySchema maxLength bounds', () => {
  it('accepts values at the configured limits', () => {
    expect(() =>
      cloudOnboardingQuerySchema.validate({
        next: 'a'.repeat(MAX_CLOUD_ONBOARDING_NEXT_LENGTH),
        onboarding_token: 'a'.repeat(MAX_CLOUD_ONBOARDING_TOKEN_LENGTH),
        resource_data: {
          deployment: {
            id: 'a'.repeat(MAX_CLOUD_DEPLOYMENT_ID_LENGTH),
            name: 'a'.repeat(MAX_CLOUD_DEPLOYMENT_NAME_LENGTH),
          },
        },
      })
    ).not.toThrow();
  });

  it.each([
    ['next', { next: 'a'.repeat(MAX_CLOUD_ONBOARDING_NEXT_LENGTH + 1) }],
    ['onboarding_token', { onboarding_token: 'a'.repeat(MAX_CLOUD_ONBOARDING_TOKEN_LENGTH + 1) }],
    [
      'deployment.id',
      {
        resource_data: {
          deployment: { id: 'a'.repeat(MAX_CLOUD_DEPLOYMENT_ID_LENGTH + 1) },
        },
      },
    ],
    [
      'deployment.name',
      {
        resource_data: {
          deployment: { name: 'a'.repeat(MAX_CLOUD_DEPLOYMENT_NAME_LENGTH + 1) },
        },
      },
    ],
  ])('rejects over-limit %s', (_label, query) => {
    expect(() => cloudOnboardingQuerySchema.validate(query)).toThrow(/maximum length/i);
  });
});
