/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFile, getPackageInfo } from '../../services/epm/packages/get';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingSettingsRequirementStepDefinition } from './settings_requirement';
import { awsPackageInfoFixture, createStepContext } from './test_helpers';

jest.mock('../../services/epm/packages/get', () => ({
  getPackageInfo: jest.fn(),
  getFile: jest.fn(),
}));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: {
    getInternalUserSOClient: jest.fn(() => ({})),
  },
}));

const packageInfoWithReadmes = {
  ...awsPackageInfoFixture,
  policy_templates: (awsPackageInfoFixture.policy_templates ?? []).map((template) => ({
    ...template,
    readme: `/package/aws/8.1.2/docs/${template.name}.md`,
  })),
};

const README = [
  '## Notes',
  '',
  '- Enable GuardDuty export first.',
  '- Use a bucket in the same region.',
].join('\n');

interface Output {
  services: Array<{ id: string; readme_notes?: string }>;
}

describe('awsOnboardingSettingsRequirementStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (getPackageInfo as jest.Mock).mockResolvedValue(packageInfoWithReadmes);
    (getFile as jest.Mock).mockResolvedValue(null);
  });

  it('builds the requirement for the selected agentless services', async () => {
    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({ services: ['guardduty', 'ec2'], region: 'us-west-2' })
    );

    const { output } = result as { output: Output & { region: string; package_version: string } };
    expect(output.region).toBe('us-west-2');
    expect(output.package_version).toBe('8.1.2');
    expect(output.services.map(({ id }) => id)).toEqual(['guardduty', 'ec2']);
  });

  it('suggests an identity name from the account and the run suffix', async () => {
    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({
        services: ['guardduty'],
        region: 'us-east-1',
        account_id: '123456789012',
        run_suffix: 'ab12cd34',
      })
    );

    const { output } = result as { output: { suggested_identity_name: string } };
    expect(output.suggested_identity_name).toBe('aws-123456789012-federated-identity-ab12cd34');
  });

  it('falls back to "account" in the identity name when the account id renders empty', async () => {
    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({
        services: ['guardduty'],
        region: 'us-east-1',
        account_id: '',
        run_suffix: 'ab12cd34',
      })
    );

    const { output } = result as { output: { suggested_identity_name: string } };
    expect(output.suggested_identity_name).toBe('aws-account-federated-identity-ab12cd34');
  });

  it('uses the selected services over the services the run started with', async () => {
    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({
        selected_services: ['ec2'],
        services: ['guardduty'],
        region: 'us-east-1',
      })
    );

    const { output } = result as { output: Output };
    expect(output.services.map(({ id }) => id)).toEqual(['ec2']);
  });

  it('rejects an unknown service the run started with when nothing was selected', async () => {
    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({ services: ['nope'], region: 'us-east-1' })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        type: 'ValidationError',
        message: expect.stringContaining('nope'),
      }),
    });
  });

  it('fails with ValidationError when no services were selected or passed', async () => {
    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({ selected_services: [], region: 'us-east-1' })
    );

    expect(result).toEqual({ error: expect.objectContaining({ type: 'ValidationError' }) });
    expect(getPackageInfo).not.toHaveBeenCalled();
  });

  it('attaches README notes when the registry serves the template README', async () => {
    (getFile as jest.Mock).mockResolvedValue({ text: async () => README });

    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({ services: ['guardduty'], region: 'us-east-1' })
    );

    expect(getFile).toHaveBeenCalledWith('aws', '8.1.2', 'docs/guardduty.md');
    const { output } = result as { output: Output };
    expect(output.services[0].readme_notes).toBe(
      '- Enable GuardDuty export first.\n- Use a bucket in the same region.'
    );
  });

  it('succeeds without notes when the README fetch fails', async () => {
    (getFile as jest.Mock).mockRejectedValue(new Error('registry down'));

    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({ services: ['guardduty'], region: 'us-east-1' })
    );

    const { output } = result as { output: Output };
    expect(output.services[0].id).toBe('guardduty');
    expect(output.services[0]).not.toHaveProperty('readme_notes');
  });

  it('fails with PermissionError when the feature flag is off', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await awsOnboardingSettingsRequirementStepDefinition.handler(
      createStepContext({ services: ['guardduty'], region: 'us-east-1' })
    );

    expect(result).toEqual({ error: expect.objectContaining({ type: 'PermissionError' }) });
    expect(getPackageInfo).not.toHaveBeenCalled();
  });
});
