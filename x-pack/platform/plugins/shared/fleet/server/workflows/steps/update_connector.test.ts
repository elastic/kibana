/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services/app_context';
import { cloudConnectorService } from '../../services/cloud_connector';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingUpdateConnectorStepDefinition } from './update_connector';
import { createStepContext } from './test_helpers';

jest.mock('../../services/cloud_connector', () => ({
  cloudConnectorService: { update: jest.fn() },
}));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: { getInternalUserSOClient: jest.fn() },
}));

const input = {
  cloud_connector_id: 'connector-1',
  template_sha: 'sha-2',
  blueprint_id: 'wif',
  blueprint_version: '4',
};

describe('awsOnboardingUpdateConnectorStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (appContextService.getInternalUserSOClient as jest.Mock).mockReturnValue({ soClient: true });
  });

  it('records the updated template on the reused connector', async () => {
    (cloudConnectorService.update as jest.Mock).mockResolvedValue({ id: 'connector-1' });

    const result = await awsOnboardingUpdateConnectorStepDefinition.handler(
      createStepContext(input)
    );

    expect(cloudConnectorService.update).toHaveBeenCalledWith({ soClient: true }, 'connector-1', {
      iac_key: 'sha-2',
      iac_blueprint_id: 'wif',
      iac_blueprint_version: '4',
    });
    expect(result).toEqual({ output: { cloud_connector_id: 'connector-1' } });
  });

  it('fails with a permission error when agentic AWS onboarding is disabled', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await awsOnboardingUpdateConnectorStepDefinition.handler(
      createStepContext(input)
    );

    expect(result.error).toEqual(expect.objectContaining({ type: 'PermissionError' }));
    expect(cloudConnectorService.update).not.toHaveBeenCalled();
  });
});
