/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

import { AwsCloudFormationClient } from './cloudformation_client';
import type { AwsSessionCredentials } from './sts';

jest.mock('@aws-sdk/client-cloudformation', () => ({
  ...jest.requireActual('@aws-sdk/client-cloudformation'),
  CloudFormationClient: jest.fn(),
}));

const send = jest.fn();
const stackArn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-onboarding-x/id';
// The SDK client is mocked, so the session only needs a region.
const session = { region: 'us-east-1' } as AwsSessionCredentials;
const updateArgs = { stackArn, templateUrl: 'https://example.com/template', parameters: [] };

describe('AwsCloudFormationClient.updateStack', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(CloudFormationClient).mockImplementation(() => ({ send } as any));
  });

  it('returns undefined when CloudFormation reports there is nothing to update', async () => {
    send.mockRejectedValue(new Error('No updates are to be performed.'));

    await expect(new AwsCloudFormationClient(session).updateStack(updateArgs)).resolves.toBe(
      undefined
    );
  });

  it('rethrows any other error', async () => {
    send.mockRejectedValue(new Error('Stack is in UPDATE_IN_PROGRESS state'));

    await expect(new AwsCloudFormationClient(session).updateStack(updateArgs)).rejects.toThrow(
      'Stack is in UPDATE_IN_PROGRESS state'
    );
  });
});
