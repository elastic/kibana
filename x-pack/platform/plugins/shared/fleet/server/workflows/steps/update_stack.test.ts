/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services/app_context';
import { awsOnboardingStackService } from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingUpdateStackStepDefinition } from './update_stack';
import { createStepContext } from './test_helpers';

jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingStackService: { update: jest.fn() },
}));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: { getInternalUserSOClient: jest.fn() },
}));

const STACK_ID = 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-onboarding-ab12/1';
const integrations = [
  { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
];
const parameters = { ElasticResourceId: 'project-1' };
const input = { stack_id: STACK_ID, integrations, template_sha: 'sha-1', parameters };

describe('awsOnboardingUpdateStackStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (appContextService.getInternalUserSOClient as jest.Mock).mockReturnValue({ soClient: true });
  });

  it('updates the stack with the merged integrations and reports the new template', async () => {
    (awsOnboardingStackService.update as jest.Mock).mockResolvedValue({
      stackId: STACK_ID,
      stackName: 'elastic-onboarding-ab12',
      template: { source: 'iacp', templateSha: 'sha-2', blueprint: { id: 'wif', version: '4' } },
      noChanges: false,
    });

    const result = await awsOnboardingUpdateStackStepDefinition.handler(createStepContext(input));

    expect(awsOnboardingStackService.update).toHaveBeenCalledWith({
      soClient: { soClient: true },
      stackArn: STACK_ID,
      integrations,
      templateSha: 'sha-1',
      parameters,
    });
    expect(result).toEqual({
      output: {
        stack_id: STACK_ID,
        stack_name: 'elastic-onboarding-ab12',
        template_sha: 'sha-2',
        blueprint_id: 'wif',
        blueprint_version: '4',
        template_source: 'iacp',
        no_changes: false,
      },
    });
  });

  it('reports no_changes when the stack already has what the run needs', async () => {
    (awsOnboardingStackService.update as jest.Mock).mockResolvedValue({
      stackId: STACK_ID,
      stackName: 'elastic-onboarding-ab12',
      template: { source: 'iacp', templateSha: 'sha-1', blueprint: { id: 'wif', version: '4' } },
      noChanges: true,
    });

    const result = await awsOnboardingUpdateStackStepDefinition.handler(createStepContext(input));

    expect(result.output?.no_changes).toBe(true);
  });

  it('fails with a permission error when agentic AWS onboarding is disabled', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await awsOnboardingUpdateStackStepDefinition.handler(createStepContext(input));

    expect(result.error).toEqual(expect.objectContaining({ type: 'PermissionError' }));
    expect(awsOnboardingStackService.update).not.toHaveBeenCalled();
  });
});
