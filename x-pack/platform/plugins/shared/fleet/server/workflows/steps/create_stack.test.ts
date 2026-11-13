/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services/app_context';
import { awsOnboardingStackService } from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingCreateStackStepDefinition } from './create_stack';
import { createStepContext } from './test_helpers';

jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingStackService: { create: jest.fn() },
}));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: { getInternalUserSOClient: jest.fn() },
}));

describe('awsOnboardingCreateStackStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (appContextService.getInternalUserSOClient as jest.Mock).mockReturnValue({ soClient: true });
  });

  it('passes integrations and parameters to the stack service and reports the template source', async () => {
    const integrations = [
      { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
    ];
    const parameters = { ElasticResourceId: 'project-1' };
    (awsOnboardingStackService.create as jest.Mock).mockResolvedValue({
      stackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/1',
      stackName: 'elastic-onboarding-ab12',
      template: { source: 'iacp', templateSha: 'sha-1', blueprint: { id: 'wif', version: '3' } },
    });

    const result = await awsOnboardingCreateStackStepDefinition.handler(
      createStepContext({ integrations, parameters })
    );

    expect(awsOnboardingStackService.create).toHaveBeenCalledWith({
      soClient: { soClient: true },
      integrations,
      parameters,
    });
    expect(result).toEqual({
      output: {
        stack_id: 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/1',
        stack_name: 'elastic-onboarding-ab12',
        template_sha: 'sha-1',
        blueprint_id: 'wif',
        blueprint_version: '3',
        template_source: 'iacp',
      },
    });
  });
});
