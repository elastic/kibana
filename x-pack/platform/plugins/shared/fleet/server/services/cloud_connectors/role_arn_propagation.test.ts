/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { appContextService } from '../app_context';
import { packagePolicyService } from '../package_policy';

import { propagateRoleArnToPackagePolicies } from './role_arn_propagation';

jest.mock('../package_policy', () => ({
  packagePolicyService: {
    list: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../app_context', () => ({
  appContextService: {
    getLogger: () => loggerMock.create(),
    getInternalUserSOClientForSpaceId: jest.fn(),
  },
}));
jest.mock('../spaces/helpers', () => ({
  getSpaceForPackagePolicy: () => 'default',
}));

const OLD_ARN = 'arn:aws:iam::123456789012:role/Old';
const NEW_ARN = 'arn:aws:iam::123456789012:role/New';
const CONNECTOR_ID = 'connector-1';
const PACKAGE = {
  name: 'cloud_security_posture',
  title: 'Security Posture Management',
  version: '1.9.0',
};

const makePolicy = (id: string, roleArn = OLD_ARN) => ({
  id,
  name: `policy-${id}`,
  policy_ids: [`agent-${id}`],
  namespace: 'default',
  enabled: true,
  package: PACKAGE,
  cloud_connector_id: CONNECTOR_ID,
  inputs: [
    {
      type: 'cloudbeat/cis_aws',
      enabled: true,
      vars: { role_arn: { type: 'text', value: roleArn } },
      streams: [],
    },
  ],
});

describe('propagateRoleArnToPackagePolicies', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createInternalClient();

  beforeEach(() => {
    jest.clearAllMocks();
    (appContextService.getInternalUserSOClientForSpaceId as jest.Mock).mockReturnValue(soClient);
  });

  it('updates every referencing package policy with the new ARN', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), makePolicy('b')],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockResolvedValue({});

    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(packagePolicyService.update).toHaveBeenCalledTimes(2);
    for (const call of (packagePolicyService.update as jest.Mock).mock.calls) {
      const [, , , update] = call;
      expect(update.inputs[0].vars.role_arn.value).toBe(NEW_ARN);
      // `packagePolicyService.update` rejects payloads without a package.
      expect(update.package).toEqual(PACKAGE);
    }
  });

  it('is a no-op when no policies reference the connector', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 10000,
    });
    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('skips policies whose inputs contain no role_arn key', async () => {
    const policyWithoutRoleArn = {
      ...makePolicy('a'),
      inputs: [{ type: 'x', enabled: true, vars: { other: { value: 'v' } }, streams: [] }],
    };
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [policyWithoutRoleArn],
      total: 1,
      page: 1,
      perPage: 10000,
    });
    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('reverts successful policies and throws when one fan-out entry fails', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), makePolicy('b'), makePolicy('c')],
      total: 3,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('boom');
      return {};
    });

    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);

    // Two initial updates (a, c) plus two reverts (a, c). b was never asked to revert.
    const calls = (packagePolicyService.update as jest.Mock).mock.calls;
    const revertCalls = calls.filter(
      ([, , , update]) => update.inputs[0].vars.role_arn.value === OLD_ARN
    );
    expect(revertCalls.map(([, , id]) => id).sort()).toEqual(['a', 'c']);
  });

  it('includes both updateFailed and revertFailed in the thrown detail', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), makePolicy('b')],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockImplementation(
      async (
        _so,
        _es,
        id: string,
        update: { inputs: Array<{ vars: { role_arn: { value: string } } }> }
      ) => {
        const to = update.inputs[0].vars.role_arn.value;
        if (id === 'b' && to === NEW_ARN) throw new Error('boom');
        if (id === 'a' && to === OLD_ARN) throw new Error('revert-boom');
        return {};
      }
    );

    let caught: CloudConnectorRoleArnPropagationError | undefined;
    try {
      await propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      });
    } catch (err) {
      caught = err as CloudConnectorRoleArnPropagationError;
    }
    expect(caught).toBeInstanceOf(CloudConnectorRoleArnPropagationError);
    expect(caught?.detail.updateFailed).toEqual(['b']);
    expect(caught?.detail.revertFailed).toEqual(['a']);
  });

  it('captures the per-policy pre-update value for revert (not the connector old value)', async () => {
    const drifted = makePolicy('drifted', 'arn:aws:iam::123456789012:role/Drifted');
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), drifted],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockImplementation(
      async (
        _so,
        _es,
        id: string,
        update: { inputs: Array<{ vars: { role_arn: { value: string } } }> }
      ) => {
        if (id === 'a' && update.inputs[0].vars.role_arn.value === NEW_ARN) {
          throw new Error('boom');
        }
        return {};
      }
    );
    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);
    const revertCall = (packagePolicyService.update as jest.Mock).mock.calls.find(
      ([, , id, update]) => id === 'drifted' && update.inputs[0].vars.role_arn.value !== NEW_ARN
    );
    // The drifted policy was successfully moved to NEW_ARN, then reverted to its own prior value.
    expect(revertCall?.[3].inputs[0].vars.role_arn.value).toBe(
      'arn:aws:iam::123456789012:role/Drifted'
    );
    expect(revertCall?.[3].package).toEqual(PACKAGE);
  });
});
