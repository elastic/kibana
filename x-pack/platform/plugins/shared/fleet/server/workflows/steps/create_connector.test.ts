/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services/app_context';
import { cloudConnectorService } from '../../services/cloud_connector';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingCreateConnectorStepDefinition } from './create_connector';
import { createStepContext } from './test_helpers';

jest.mock('../../services/cloud_connector', () => ({
  cloudConnectorService: { create: jest.fn() },
}));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: { getInternalUserSOClient: jest.fn() },
}));

describe('awsOnboardingCreateConnectorStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (appContextService.getInternalUserSOClient as jest.Mock).mockReturnValue({ soClient: true });
  });

  it('creates an aws connector carrying role_arn and the IaC fields from the stack', async () => {
    (cloudConnectorService.create as jest.Mock).mockResolvedValue({ id: 'connector-1' });

    const result = await awsOnboardingCreateConnectorStepDefinition.handler(
      createStepContext({
        name: 'prod-account',
        role_arn: 'arn:aws:iam::123456789012:role/elastic',
        stack_id: 'stack-arn',
        template_sha: 'sha-1',
        blueprint_id: 'wif',
        blueprint_version: '3',
      })
    );

    expect(cloudConnectorService.create).toHaveBeenCalledWith(
      { soClient: true },
      {
        name: 'prod-account',
        cloudProvider: 'aws',
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/elastic' } },
        iac_key: 'sha-1',
        iac_blueprint_id: 'wif',
        iac_blueprint_version: '3',
        iac_deployment_id: 'stack-arn',
      }
    );
    expect(result).toEqual({ output: { cloud_connector_id: 'connector-1' } });
  });
});
