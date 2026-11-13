/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services/app_context';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingCloudContextStepDefinition } from './cloud_context';
import { createStepContext } from './test_helpers';

jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: { getCloud: jest.fn() },
}));

const serverlessCloud = {
  isCloudEnabled: true,
  isServerlessEnabled: true,
  serverless: { projectId: 'project-1' },
  organizationId: 'org-1',
  csp: 'aws',
  region: 'us-east-1',
};

describe('awsOnboardingCloudContextStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
  });

  it('lets overrides replace individual derived parameters', async () => {
    (appContextService.getCloud as jest.Mock).mockReturnValue(serverlessCloud);

    const result = await awsOnboardingCloudContextStepDefinition.handler(
      createStepContext({ overrides: { ElasticCloudRegion: 'eu-west-1' } })
    );

    expect(result).toEqual({
      output: {
        source: 'cloud',
        parameters: expect.objectContaining({
          ElasticCloudRegion: 'eu-west-1',
          ElasticResourceId: 'project-1',
        }),
      },
    });
  });

  it('reports overrides as the source when cloud contributes nothing', async () => {
    (appContextService.getCloud as jest.Mock).mockReturnValue(undefined);

    const result = await awsOnboardingCloudContextStepDefinition.handler(
      createStepContext({ overrides: { ElasticResourceId: 'local' } })
    );

    expect(result).toEqual({
      output: { source: 'overrides', parameters: { ElasticResourceId: 'local' } },
    });
  });

  it('refuses to run while the feature flag is off', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await awsOnboardingCloudContextStepDefinition.handler(createStepContext({}));

    expect(result).toEqual({ error: expect.objectContaining({ type: 'PermissionError' }) });
  });
});
