/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services/app_context';
import { awsOnboardingCredentialsService } from '../../services/aws_onboarding';
import { cloudConnectorService } from '../../services/cloud_connector';
import { packagePolicyService } from '../../services/package_policy';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingListIdentitiesStepDefinition } from './list_identities';
import { createStepContext } from './test_helpers';

jest.mock('../../services/cloud_connector', () => ({
  cloudConnectorService: { getList: jest.fn() },
}));
jest.mock('../../services/package_policy', () => ({
  packagePolicyService: { list: jest.fn() },
}));
jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingCredentialsService: { getPublic: jest.fn() },
}));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: { getInternalUserSOClient: jest.fn() },
}));

const ACCOUNT = '123456789012';

const connector = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `identity-${id}`,
  cloudProvider: 'aws',
  vars: { role_arn: { type: 'text', value: `arn:aws:iam::${ACCOUNT}:role/role-${id}` } },
  created_at: '2026-11-17T10:00:00.000Z',
  updated_at: '2026-11-17T10:00:00.000Z',
  ...extra,
});

const stackArn = (region: string, name: string) =>
  `arn:aws:cloudformation:${region}:${ACCOUNT}:stack/${name}/0a1b2c3d`;

const packagePolicy = (
  packageName: string,
  inputs: Array<{ type: string; policy_template: string; enabled: boolean }>
) => ({ package: { name: packageName }, inputs });

const getList = cloudConnectorService.getList as jest.Mock;
const listPolicies = packagePolicyService.list as jest.Mock;

const runStep = async (input: { account_id?: string } = { account_id: ACCOUNT }) => {
  const result = await awsOnboardingListIdentitiesStepDefinition.handler(createStepContext(input));
  return (result as { output: { identities: Array<Record<string, unknown>> } }).output.identities;
};

describe('awsOnboardingListIdentitiesStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (appContextService.getInternalUserSOClient as jest.Mock).mockReturnValue({ soClient: true });
    (awsOnboardingCredentialsService.getPublic as jest.Mock).mockResolvedValue({
      configured: true,
      region: 'us-east-1',
      stackNamePrefix: 'elastic-onboarding',
    });
    listPolicies.mockResolvedValue({ items: [] });
  });

  it('drops a connector whose role belongs to another account', async () => {
    getList.mockResolvedValue([
      connector('mine'),
      connector('theirs', {
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::999999999999:role/other' } },
      }),
    ]);

    const identities = await runStep();

    expect(identities.map(({ id }) => id)).toEqual(['mine']);
  });

  it('marks a connector whose stack is in another region as not updatable', async () => {
    getList.mockResolvedValue([
      connector('west', { iac_deployment_id: stackArn('us-west-2', 'elastic-onboarding-ab12') }),
    ]);

    const [identity] = await runStep();

    expect(identity).toEqual(
      expect.objectContaining({
        stack_region: 'us-west-2',
        updatable: false,
        not_updatable_reason: 'other_region',
      })
    );
  });

  it('marks a connector without a stack as not updatable', async () => {
    getList.mockResolvedValue([connector('manual')]);

    const [identity] = await runStep();

    expect(identity).toEqual(
      expect.objectContaining({ updatable: false, not_updatable_reason: 'no_stack' })
    );
    expect(identity).not.toHaveProperty('stack_id');
  });

  it('merges the enabled inputs of the policies of one package into one covered entry', async () => {
    const stackId = stackArn('us-east-1', 'elastic-onboarding-ab12');
    getList.mockResolvedValue([
      connector('cc-1', { iac_deployment_id: stackId, iac_key: 'sha-1' }),
    ]);
    listPolicies.mockResolvedValue({
      items: [
        packagePolicy('aws', [
          { type: 'aws-s3', policy_template: 'guardduty', enabled: true },
          { type: 'httpjson', policy_template: 'guardduty', enabled: false },
        ]),
        packagePolicy('aws', [
          { type: 'httpjson', policy_template: 'guardduty', enabled: true },
          { type: 'aws/metrics', policy_template: 'lambda', enabled: true },
        ]),
      ],
    });

    const [identity] = await runStep();

    expect(listPolicies).toHaveBeenCalledWith(
      { soClient: true },
      {
        kuery: 'fleet-package-policies.attributes.cloud_connector_id:"cc-1"',
        perPage: 1000,
      }
    );
    expect(identity).toEqual({
      id: 'cc-1',
      name: 'identity-cc-1',
      stack_id: stackId,
      stack_region: 'us-east-1',
      template_sha: 'sha-1',
      created_at: '2026-11-17T10:00:00.000Z',
      updatable: true,
      covered_integrations: [
        {
          name: 'aws',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-s3', 'httpjson'] },
            { name: 'lambda', enabledInputs: ['aws/metrics'] },
          ],
        },
      ],
      covered_policy_templates: ['guardduty', 'lambda'],
    });
  });
});
