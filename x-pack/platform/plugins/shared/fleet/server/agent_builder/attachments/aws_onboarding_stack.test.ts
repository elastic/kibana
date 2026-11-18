/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAwsOnboardingStackAttachmentType } from './aws_onboarding_stack';

const data = {
  execution_id: 'e1',
  stack_id: 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-onboarding-x/id',
  stack_name: 'elastic-onboarding-x',
  region: 'us-east-1',
  action: 'update' as const,
  for_services: ['Amazon GuardDuty'],
  adding: ['guardduty'],
  started_at: '2026-11-18T10:00:00.000Z',
};

describe('aws onboarding stack attachment type', () => {
  it('accepts the documented shape', () => {
    expect(createAwsOnboardingStackAttachmentType().validate(data)).toEqual({
      valid: true,
      data,
    });
  });

  it('rejects a region that could change the console link host', () => {
    expect(
      createAwsOnboardingStackAttachmentType().validate({ ...data, region: 'evil.example.com/x' })
    ).toMatchObject({ valid: false });
  });

  it('rejects an extra key', () => {
    expect(
      createAwsOnboardingStackAttachmentType().validate({ ...data, role_arn: 'x' })
    ).toMatchObject({ valid: false });
  });
});
