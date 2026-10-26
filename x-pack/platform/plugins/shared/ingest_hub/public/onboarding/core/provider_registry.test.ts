/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_ONBOARDING_TITLE,
  AWS_ONBOARDING_DESCRIPTION,
} from '../../../common/providers/aws/constants';
import { getOnboardingProvider } from './provider_registry';

describe('getOnboardingProvider()', () => {
  it('returns the AWS provider definition for "aws"', () => {
    expect(getOnboardingProvider('aws')).toEqual({
      id: 'aws',
      meta: {
        title: AWS_ONBOARDING_TITLE,
        description: AWS_ONBOARDING_DESCRIPTION,
        icon: 'logoAWS',
      },
    });
  });

  it.each(['unknown', 'toString', '__proto__', ''])('returns undefined for "%s"', (id) => {
    expect(getOnboardingProvider(id)).toBeUndefined();
  });
});
