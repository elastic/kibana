/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAwsOnboardingRunAttachmentType } from './aws_onboarding_run';

const data = {
  execution_id: 'e1',
  workflow_id: 'fleet-aws-agentless-onboarding',
  region: 'us-east-1',
  for_services: ['Amazon GuardDuty'],
  stack_action: 'update' as const,
  adding: ['guardduty'],
  started_at: '2026-11-18T10:00:00.000Z',
};

describe('aws onboarding run attachment type', () => {
  it('accepts the documented shape', () => {
    expect(createAwsOnboardingRunAttachmentType().validate(data)).toEqual({
      valid: true,
      data,
    });
  });

  it('rejects a region that could change the console link host', () => {
    expect(
      createAwsOnboardingRunAttachmentType().validate({ ...data, region: 'evil.example.com/x' })
    ).toMatchObject({ valid: false });
  });

  it('rejects an extra key', () => {
    expect(
      createAwsOnboardingRunAttachmentType().validate({ ...data, stack_id: 'x' })
    ).toMatchObject({ valid: false });
  });
});
