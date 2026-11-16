/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE } from '../../../common/agent_builder/aws_onboarding_credentials_attachment';

import { createAwsOnboardingCredentialsAttachmentType } from './aws_onboarding_credentials';

describe('aws onboarding credentials attachment type', () => {
  it('accepts the documented shape and rejects extra keys', () => {
    const type = createAwsOnboardingCredentialsAttachmentType();
    expect(type.validate({ execution_id: 'e1', region: 'us-east-1', status: 'pending' })).toEqual({
      valid: true,
      data: { execution_id: 'e1', region: 'us-east-1', status: 'pending' },
    });
    expect(
      type.validate({
        execution_id: 'e1',
        region: 'us-east-1',
        status: 'pending',
        secret_access_key: 'x',
      })
    ).toMatchObject({ valid: false });
  });

  it('formats the status for the agent without any credential values', async () => {
    const type = createAwsOnboardingCredentialsAttachmentType();
    const formatted = await type.format(
      {
        id: 'a1',
        type: AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
        data: {
          execution_id: 'e1',
          region: 'us-east-1',
          status: 'verified',
          account_id: '123456789012',
          access_key_id_masked: 'AKIA…WXYZ',
        },
      } as any,
      {} as any
    );
    const text = JSON.stringify(formatted.getRepresentation());
    expect(text).toContain('verified');
    expect(text).toContain('123456789012');
    expect(text).not.toContain('AKIA');
  });

  it('includes the error when verification failed', async () => {
    const type = createAwsOnboardingCredentialsAttachmentType();
    const formatted = await type.format(
      {
        id: 'a1',
        type: AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
        data: {
          execution_id: 'e1',
          region: 'us-east-1',
          status: 'verify_failed',
          error: 'AccessDenied',
        },
      } as any,
      {} as any
    );
    expect(JSON.stringify(formatted.getRepresentation())).toContain('AccessDenied');
  });

  it('is read-only for the agent', () => {
    expect(createAwsOnboardingCredentialsAttachmentType().isReadonly).toBe(true);
  });
});
