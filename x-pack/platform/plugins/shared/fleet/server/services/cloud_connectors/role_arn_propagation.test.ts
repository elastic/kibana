/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { agentPolicyService } from '../agent_policy';
import { getAgentTemplateAssetsMap, getPackageInfo } from '../epm/packages/get';
import {
  _compilePackagePolicyInputs,
  getPackagePolicySavedObjectType,
  packagePolicyService,
} from '../package_policy';

import { propagateRoleArnToPackagePolicies } from './role_arn_propagation';

jest.mock('../epm/packages/get', () => ({
  getPackageInfo: jest.fn(),
  getAgentTemplateAssetsMap: jest.fn(),
}));
jest.mock('../package_policy', () => ({
  _compilePackagePolicyInputs: jest.fn(),
  packagePolicyService: {
    fetchAllItems: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  },
  toPackagePolicyUpdate: (policy: {
    name: string;
    enabled: boolean;
    policy_ids: string[];
    inputs: unknown;
    vars?: unknown;
    package?: unknown;
  }) => ({
    name: policy.name,
    enabled: policy.enabled,
    policy_ids: policy.policy_ids,
    inputs: policy.inputs,
    vars: policy.vars,
    ...(policy.package ? { package: policy.package } : {}),
  }),
  _normalizePackagePolicyKuery: (_savedObjectType: string, kuery: string) => kuery,
  getPackagePolicySavedObjectType: jest.fn(),
}));
jest.mock('../agent_policy', () => ({
  agentPolicyService: {
    bumpAgentPoliciesByIds: jest.fn(),
  },
}));
jest.mock('../app_context', () => ({
  appContextService: {
    getLogger: () => loggerMock.create(),
  },
}));

const OLD_ARN = 'arn:aws:iam::123456789012:role/Old';
const NEW_ARN = 'arn:aws:iam::123456789012:role/New';
const CONNECTOR_ID = 'connector-1';
const PACKAGE = {
  name: 'cloud_security_posture',
  title: 'Security Posture Management',
  version: '1.9.0',
};
const PREVIOUS_PACKAGE = { ...PACKAGE, version: '1.8.0' };

const makePolicy = (id: string, roleArn = OLD_ARN, spaceIds = ['default']) => ({
  id,
  name: `policy-${id}`,
  policy_ids: [`agent-${id}`],
  namespace: 'default',
  spaceIds,
  enabled: true,
  version: `Wz${id}`,
  package: PACKAGE,
  vars: { account_type: { type: 'text', value: 'single-account' } },
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

// Mirror `packagePolicyService.fetchAllItems`: a Promise resolving to an async iterable of pages.
// Tests care about the collected items, not the page boundary, so one page is enough.
const mockListReturns = (items: unknown[]) => {
  (packagePolicyService.fetchAllItems as jest.Mock).mockResolvedValue({
    async *[Symbol.asyncIterator]() {
      yield items;
    },
  });
};

const snapshotUpdateResponse = (id: string, version: string) => ({
  id,
  type: 'ingest-package-policies',
  version,
  attributes: {},
  references: [],
});

const makeSnapshotFindResult = (attributes: Record<string, unknown>) => ({
  id: 'a:prev',
  type: 'ingest-package-policies',
  version: 'Wz-prev',
  score: 1,
  references: [],
  attributes: { latest_revision: false, package: PREVIOUS_PACKAGE, ...attributes },
});

/** Stands in for template compilation: records the role ARN and agent version it compiled with. */
const compileInputs = (
  _pkgInfo: unknown,
  _vars: unknown,
  inputs: Array<{ vars?: { role_arn?: { value?: string } } }>,
  _assetsMap: unknown,
  agentVersion?: string
) =>
  inputs.map((input) => ({
    ...input,
    compiled_input: { role_arn: input.vars?.role_arn?.value, agentVersion },
  }));

describe('propagateRoleArnToPackagePolicies', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createInternalClient();

  beforeEach(() => {
    jest.clearAllMocks();
    soClient.getCurrentNamespace.mockReturnValue('default');
    // Default: a failed update left the SO untouched (still on OLD_ARN), so the post-persist
    // re-read does not pull the plan into the revert set.
    (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) =>
      makePolicy(id)
    );
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => ({
      id,
      version: `Wz${id}-after`,
    }));
    (agentPolicyService.bumpAgentPoliciesByIds as jest.Mock).mockImplementation(
      async (ids: string[]) => ({
        saved_objects: ids.map((id) => ({
          id,
          type: 'ingest-agent-policies',
          attributes: {},
          references: [],
        })),
      })
    );
    (getPackagePolicySavedObjectType as jest.Mock).mockResolvedValue(
      PACKAGE_POLICY_SAVED_OBJECT_TYPE
    );
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 100 });
    soClient.update.mockReset();
    soClient.update.mockResolvedValue(snapshotUpdateResponse('snapshot', 'Wz-snapshot-after'));
    (getPackageInfo as jest.Mock).mockImplementation(
      async ({ pkgName, pkgVersion }: { pkgName: string; pkgVersion: string }) => ({
        name: pkgName,
        version: pkgVersion,
      })
    );
    (getAgentTemplateAssetsMap as jest.Mock).mockResolvedValue(new Map());
    (_compilePackagePolicyInputs as jest.Mock).mockImplementation(compileInputs);
  });

  it('updates every referencing package policy with the new ARN', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);

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
      // The update is a replace: the policy's own vars have to be carried over.
      expect(update.vars).toEqual({ account_type: { type: 'text', value: 'single-account' } });
      // OCC token from the PIT fetch — without it a concurrent edit is silently overwritten.
      expect(update.version).toMatch(/^Wz/);
    }
  });

  it('rewrites role_arn at top-level packagePolicy.vars (AWS-package shape)', async () => {
    // The `aws` integration stores the ARN once on the package policy's top-level `vars` and
    // every input/stream references it via a handlebars template at compile time. If the fan-out
    // only walked input/stream vars (as it did initially) every AWS-integration policy would go
    // stale — the bug caught in issue 9666 / PR 292515.
    const awsPolicy = {
      id: 'aws-1',
      name: 'aws-1',
      policy_ids: ['agent-aws'],
      namespace: 'default',
      spaceIds: ['default'],
      enabled: true,
      package: { name: 'aws', title: 'AWS', version: '8.4.0' },
      vars: {
        role_arn: { type: 'text', value: OLD_ARN },
        default_region: { type: 'text', value: 'us-east-2' },
      },
      cloud_connector_id: CONNECTOR_ID,
      inputs: [
        {
          type: 'aws/metrics',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'metrics', dataset: 'aws.ec2' },
              vars: { period: { type: 'text', value: '5m' } },
            },
          ],
        },
      ],
    };
    mockListReturns([awsPolicy]);

    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(packagePolicyService.update).toHaveBeenCalledTimes(1);
    const update = (packagePolicyService.update as jest.Mock).mock.calls[0][3];
    expect(update.vars.role_arn.value).toBe(NEW_ARN);
    // Unrelated shared vars must be preserved because the SO write replaces `vars` wholesale.
    expect(update.vars.default_region.value).toBe('us-east-2');
    // Inputs untouched: the top-level rewrite alone should be enough.
    expect(update.inputs).toEqual(awsPolicy.inputs);
  });

  it('reads and writes package policies through the request-scoped soClient', async () => {
    mockListReturns([]);

    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    const [listSoClient, listOptions] = (packagePolicyService.fetchAllItems as jest.Mock).mock
      .calls[0];
    // Same client as the PUT that triggered the fan-out — no cross-space internal escalation.
    expect(listSoClient).toBe(soClient);
    expect(listOptions).toEqual(
      expect.objectContaining({
        kuery: `fleet-package-policies.attributes.cloud_connector_id:"${CONNECTOR_ID}"`,
      })
    );
    expect(listOptions.spaceIds).toBeUndefined();
  });

  it('writes every update through the request-scoped soClient', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);

    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(packagePolicyService.update).toHaveBeenCalledTimes(2);
    for (const call of (packagePolicyService.update as jest.Mock).mock.calls) {
      expect(call[0]).toBe(soClient);
    }
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-a', 'agent-b'],
      {},
      'default'
    );
  });

  it('defers the agent policy revision bump to a single call', async () => {
    // Every policy on a shared agent policy would otherwise race the same `revision` field.
    const shared = [makePolicy('a'), makePolicy('b')].map((policy) => ({
      ...policy,
      policy_ids: ['agent-shared'],
    }));
    mockListReturns(shared);

    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    for (const call of (packagePolicyService.update as jest.Mock).mock.calls) {
      expect(call[4]).toEqual(expect.objectContaining({ bumpRevision: false }));
    }
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(1);
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-shared'],
      {},
      'default'
    );
  });

  it('threads the request user into package-policy updates', async () => {
    mockListReturns([makePolicy('a')]);
    const user = { username: 'sean' } as AuthenticatedUser;

    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
      user,
    });

    expect(packagePolicyService.update).toHaveBeenCalledWith(
      soClient,
      esClient,
      'a',
      expect.any(Object),
      expect.objectContaining({ bumpRevision: false, user })
    );
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-a'],
      { user },
      'default'
    );
  });

  it('treats a partial agent-policy bump response as a failure', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);
    (agentPolicyService.bumpAgentPoliciesByIds as jest.Mock).mockResolvedValueOnce({
      saved_objects: [
        { id: 'agent-a', type: 'agent-policy', attributes: {}, references: [] },
        {
          id: 'agent-b',
          type: 'agent-policy',
          error: { error: 'Conflict', message: 'version conflict', statusCode: 409 },
        },
      ],
    });

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
    expect(caught?.message).toMatch(/Failed to bump agent policy revisions/);
    expect(caught?.message).toMatch(/agent-b/);
    expect(caught?.message).toMatch(/version conflict/);
    expect(caught?.detail.bumpFailed).toBe(false);
  });

  it('treats agent policies missing from the bump response as a failure', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);
    (agentPolicyService.bumpAgentPoliciesByIds as jest.Mock).mockResolvedValueOnce({
      saved_objects: [{ id: 'agent-a', type: 'agent-policy', attributes: {}, references: [] }],
    });

    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toThrow(/Failed to bump agent policy revisions.*agent-b/);

    const revertCalls = (packagePolicyService.update as jest.Mock).mock.calls.filter(
      ([, , , update]) => update.inputs[0].vars.role_arn.value === OLD_ARN
    );
    expect(revertCalls.map(([, , id]) => id).sort()).toEqual(['a', 'b']);
  });

  it('reverts policies and throws when the agent-policy revision bump fails', async () => {
    // With bumpRevision: false on every package-policy write, the deferred bump is the only
    // deployment trigger. Reporting success while it fails would leave agents on the old ARN.
    mockListReturns([makePolicy('a'), makePolicy('b')]);
    (agentPolicyService.bumpAgentPoliciesByIds as jest.Mock).mockRejectedValue(
      new Error('bump boom')
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
    expect(caught?.message).toMatch(/Failed to bump agent policy revisions/);
    expect(caught?.message).toMatch(/reverted successfully/);
    expect(caught?.message).toMatch(/Agent policy revision bump after revert also failed/);
    expect(caught?.detail.updateFailed).toEqual(['a', 'b']);
    expect(caught?.detail.revertFailed).toEqual([]);
    expect(caught?.detail.bumpFailed).toBe(true);

    const revertCalls = (packagePolicyService.update as jest.Mock).mock.calls.filter(
      ([, , , update]) => update.inputs[0].vars.role_arn.value === OLD_ARN
    );
    expect(revertCalls.map(([, , id]) => id).sort()).toEqual(['a', 'b']);
    // Forward bump once, then a second bump after revert so agents drop the brief new ARN.
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(2);
  });

  it('bumps the reverted agent policies after a failed fan-out', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('boom');
      return { id, version: `Wz${id}-after` };
    });

    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);

    // Only `a` was updated and then reverted, so only its agent policy needs the bump.
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(1);
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-a'],
      {},
      'default'
    );
  });

  it('does not bump anything when there is nothing to fan out', async () => {
    mockListReturns([]);

    const rollback = await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(rollback).toBeUndefined();
    expect(agentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
  });

  it('returns a rollback handle that restores exact per-policy snapshots', async () => {
    // Policies may have drifted from the connector's stored ARN. Re-fanning with a global
    // oldRoleArn would force every policy onto that value; the handle must restore each
    // policy's own pre-forward snapshot instead.
    const drifted = makePolicy('drifted', 'arn:aws:iam::123456789012:role/Drifted');
    mockListReturns([makePolicy('a'), drifted]);

    const user = { username: 'sean' } as AuthenticatedUser;
    const rollback = await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
      user,
    });

    expect(rollback).toEqual(
      expect.objectContaining({ policyCount: 2, revert: expect.any(Function) })
    );

    (packagePolicyService.update as jest.Mock).mockClear();
    (agentPolicyService.bumpAgentPoliciesByIds as jest.Mock).mockClear();

    await rollback!.revert();

    const revertById = Object.fromEntries(
      (packagePolicyService.update as jest.Mock).mock.calls.map(([, , id, update]) => [id, update])
    );
    expect(revertById.a.inputs[0].vars.role_arn.value).toBe(OLD_ARN);
    expect(revertById.drifted.inputs[0].vars.role_arn.value).toBe(
      'arn:aws:iam::123456789012:role/Drifted'
    );
    // OCC token from the successful forward write, not the original PIT version.
    expect(revertById.a.version).toBe('Wza-after');
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(1);
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-a', 'agent-drifted'],
      { user },
      'default'
    );
  });

  it('rewrites role_arn on the package-policy rollback snapshot', async () => {
    mockListReturns([makePolicy('a')]);
    soClient.find.mockResolvedValue({
      saved_objects: [
        makeSnapshotFindResult({
          vars: { account_type: { type: 'text', value: 'single-account' } },
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              vars: { role_arn: { type: 'text', value: OLD_ARN } },
              streams: [],
            },
          ],
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
    });
    soClient.update.mockResolvedValue(snapshotUpdateResponse('a:prev', 'Wz-prev-after'));

    const rollback = await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    const snapshotWrite = soClient.update.mock.calls.find(([, id]) => id === 'a:prev');
    expect(snapshotWrite?.[2]).toMatchObject({
      inputs: [{ vars: { role_arn: { value: NEW_ARN } } }],
    });
    expect(snapshotWrite?.[3]).toEqual({ version: 'Wz-prev' });

    soClient.update.mockClear();
    await rollback!.revert();

    const snapshotRevert = soClient.update.mock.calls.find(([, id]) => id === 'a:prev');
    expect(snapshotRevert?.[2]).toMatchObject({
      inputs: [{ vars: { role_arn: { value: OLD_ARN } } }],
    });
    expect(snapshotRevert?.[3]).toEqual({ version: 'Wz-prev-after' });
  });

  it('rewrites a rollback snapshot even when no current policy references the connector', async () => {
    mockListReturns([]);
    soClient.find.mockResolvedValue({
      saved_objects: [
        makeSnapshotFindResult({
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              vars: { role_arn: { type: 'text', value: OLD_ARN } },
              streams: [],
            },
          ],
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
    });

    const rollback = await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    const snapshotWrite = soClient.update.mock.calls.find(([, id]) => id === 'a:prev');
    expect(snapshotWrite?.[2]).toMatchObject({
      inputs: [{ vars: { role_arn: { value: NEW_ARN } } }],
    });
    expect(rollback?.policyCount).toBe(1);
  });

  it('recompiles a rewritten rollback snapshot for its own package version', async () => {
    // Package rollback copies the snapshot's compiled inputs onto the policy without compiling
    // them again, so compiled output left on the old ARN would redeploy the old role.
    mockListReturns([]);
    const snapshotInputs = [
      {
        type: 'cloudbeat/cis_aws',
        enabled: true,
        vars: { role_arn: { type: 'text', value: OLD_ARN } },
        streams: [],
        compiled_input: { role_arn: OLD_ARN },
      },
    ];
    const snapshotInputsForVersions = {
      '9.1.0': [
        { ...snapshotInputs[0], compiled_input: { role_arn: OLD_ARN, agentVersion: '9.1.0' } },
      ],
    };
    soClient.find.mockResolvedValue({
      saved_objects: [
        makeSnapshotFindResult({
          inputs: snapshotInputs,
          inputs_for_versions: snapshotInputsForVersions,
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
    });
    soClient.update.mockResolvedValue(snapshotUpdateResponse('a:prev', 'Wz-prev-after'));

    const rollback = await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(getPackageInfo).toHaveBeenCalledWith(
      expect.objectContaining({ pkgName: PREVIOUS_PACKAGE.name, pkgVersion: '1.8.0' })
    );
    const snapshotWrite = soClient.update.mock.calls.find(([, id]) => id === 'a:prev');
    expect(snapshotWrite?.[2]).toMatchObject({
      inputs: [{ vars: { role_arn: { value: NEW_ARN } }, compiled_input: { role_arn: NEW_ARN } }],
      inputs_for_versions: {
        '9.1.0': [{ compiled_input: { role_arn: NEW_ARN, agentVersion: '9.1.0' } }],
      },
    });

    soClient.update.mockClear();
    await rollback!.revert();

    const snapshotRevert = soClient.update.mock.calls.find(([, id]) => id === 'a:prev');
    expect(snapshotRevert?.[2]).toEqual({
      vars: undefined,
      inputs: snapshotInputs,
      inputs_for_versions: snapshotInputsForVersions,
    });
  });

  it('refuses the change before any write when a rollback snapshot cannot be recompiled', async () => {
    mockListReturns([makePolicy('a')]);
    soClient.find.mockResolvedValue({
      saved_objects: [
        makeSnapshotFindResult({
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              vars: { role_arn: { type: 'text', value: OLD_ARN } },
              streams: [],
            },
          ],
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
    });
    (getPackageInfo as jest.Mock).mockRejectedValue(new Error('registry unavailable'));

    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toMatchObject({
      detail: { updateFailed: ['a:prev'], revertFailed: [], bumpFailed: false },
    });
    expect(packagePolicyService.update).not.toHaveBeenCalled();
    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('reads and writes rollback snapshots with the legacy type when space awareness is off', async () => {
    (getPackagePolicySavedObjectType as jest.Mock).mockResolvedValue(
      LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE
    );
    mockListReturns([makePolicy('a')]);
    soClient.find.mockResolvedValue({
      saved_objects: [
        makeSnapshotFindResult({
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              vars: { role_arn: { type: 'text', value: OLD_ARN } },
              streams: [],
            },
          ],
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
    });

    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE })
    );
    const snapshotWrite = soClient.update.mock.calls.find(([, id]) => id === 'a:prev');
    expect(snapshotWrite?.[0]).toBe(LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE);
  });

  it('reverts active policies when a rollback snapshot update fails', async () => {
    mockListReturns([makePolicy('a')]);
    soClient.find.mockResolvedValue({
      saved_objects: [
        makeSnapshotFindResult({
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              vars: { role_arn: { type: 'text', value: OLD_ARN } },
              streams: [],
            },
          ],
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
    });
    soClient.update.mockRejectedValue(new Error('snapshot boom'));

    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);

    const revertCalls = (packagePolicyService.update as jest.Mock).mock.calls.filter(
      ([, , , update]) => update.inputs[0].vars.role_arn.value === OLD_ARN
    );
    expect(revertCalls.map(([, , id]) => id)).toEqual(['a']);
  });

  it('rollback handle throws with revertFailed when a snapshot restore fails', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);

    const rollback = await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('revert boom');
      return { id, version: `Wz${id}-reverted` };
    });

    let caught: CloudConnectorRoleArnPropagationError | undefined;
    try {
      await rollback!.revert();
    } catch (err) {
      caught = err as CloudConnectorRoleArnPropagationError;
    }

    expect(caught).toBeInstanceOf(CloudConnectorRoleArnPropagationError);
    expect(caught?.detail.updateFailed).toEqual([]);
    expect(caught?.detail.revertFailed).toEqual(['b']);
    expect(caught?.detail.bumpFailed).toBe(false);
  });

  it('rollback handle reports bumpFailed when the post-revert bump fails', async () => {
    mockListReturns([makePolicy('a')]);

    const rollback = await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    (agentPolicyService.bumpAgentPoliciesByIds as jest.Mock).mockRejectedValueOnce(
      new Error('revert bump boom')
    );

    let caught: CloudConnectorRoleArnPropagationError | undefined;
    try {
      await rollback!.revert();
    } catch (err) {
      caught = err as CloudConnectorRoleArnPropagationError;
    }

    expect(caught).toBeInstanceOf(CloudConnectorRoleArnPropagationError);
    expect(caught?.detail.updateFailed).toEqual([]);
    expect(caught?.detail.revertFailed).toEqual([]);
    expect(caught?.detail.bumpFailed).toBe(true);
    expect(caught?.message).toMatch(/agent policy revision bump failed/i);
  });

  it('rejects packageless policies before any write', async () => {
    // packagePolicyService.update throws on policies without a package; the old unit test mocked
    // that away and claimed we could omit `package` from the payload. Fail fast instead.
    const { package: _package, ...policyWithoutPackage } = makePolicy('a');
    mockListReturns([policyWithoutPackage, makePolicy('b')]);

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
    expect(caught?.detail.updateFailed).toEqual(['a']);
    expect(caught?.message).toMatch(/lack.*a package/i);
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('rejects managed package policies before any write', async () => {
    // packagePolicyService.update only refuses a managed policy when the incoming payload sets
    // is_managed. Omitting it lets a connector edit rewrite Role ARN vars the normal update
    // flow would reject.
    mockListReturns([{ ...makePolicy('a'), is_managed: true }, makePolicy('b')]);

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
    expect(caught?.detail.updateFailed).toEqual(['a']);
    expect(caught?.message).toMatch(/managed/i);
    expect(packagePolicyService.update).not.toHaveBeenCalled();
    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('rejects a managed rollback snapshot before rewriting it', async () => {
    mockListReturns([makePolicy('a', NEW_ARN)]);
    soClient.find.mockResolvedValue({
      saved_objects: [
        makeSnapshotFindResult({
          is_managed: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              vars: { role_arn: { type: 'text', value: OLD_ARN } },
              streams: [],
            },
          ],
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
    });

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
    expect(caught?.detail.updateFailed).toEqual(['a:prev']);
    expect(soClient.update).not.toHaveBeenCalled();
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('is a no-op when no policies reference the connector', async () => {
    mockListReturns([]);
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
    mockListReturns([policyWithoutRoleArn]);
    await propagateRoleArnToPackagePolicies({
      soClient,
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('reverts successful policies and throws when one fan-out entry fails', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b'), makePolicy('c')]);
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('boom');
      return { id, version: `Wz${id}-after` };
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
    // Revert uses the OCC token returned by the forward write, not the PIT-fetched one.
    for (const [, , id, update] of revertCalls) {
      expect(update.version).toBe(`Wz${id}-after`);
    }
  });

  it('includes bumpFailed when the post-revert agent-policy bump fails', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('boom');
      return { id, version: `Wz${id}-after` };
    });
    (agentPolicyService.bumpAgentPoliciesByIds as jest.Mock).mockRejectedValue(
      new Error('bump after revert boom')
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
    expect(caught?.detail.revertFailed).toEqual([]);
    expect(caught?.detail.bumpFailed).toBe(true);
    expect(caught?.message).toMatch(/Agent policy revision bump after revert also failed/);
  });

  it('includes both updateFailed and revertFailed in the thrown detail', async () => {
    mockListReturns([makePolicy('a'), makePolicy('b')]);
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
        return { id, version: `Wz${id}-after` };
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
    expect(caught?.detail.bumpFailed).toBe(false);
  });

  it('reports failed ids in a stable order, capped in the message but complete in the detail', async () => {
    // `pMap` resolves out of order, so the same failure must not produce a different message
    // each time; a connector with hundreds of policies must not produce an unreadable one.
    const ids = Array.from({ length: 25 }, (_, index) => `p${String(index).padStart(2, '0')}`);
    mockListReturns(ids.map((id) => makePolicy(id)));
    (packagePolicyService.update as jest.Mock).mockRejectedValue(new Error('boom'));

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

    expect(caught?.detail.updateFailed).toEqual(ids);
    expect(caught?.message).toContain(`(ids: ${ids.slice(0, 20).join(', ')}, +5 more)`);
    expect(caught?.message).not.toContain('p20');
  });

  it('captures the per-policy pre-update value for revert (not the connector old value)', async () => {
    const drifted = makePolicy('drifted', 'arn:aws:iam::123456789012:role/Drifted');
    mockListReturns([makePolicy('a'), drifted]);
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
        return { id, version: `Wz${id}-after` };
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

  it('reverts a policy whose SO persisted even though update() later rejected', async () => {
    // packagePolicyService.update writes the SO, then can still reject in compilation / secret
    // cleanup / post-update callbacks. Without a re-read that policy would sit in updateFailed
    // and never enter Phase 2, leaving it on the new ARN while the connector stays on the old.
    mockListReturns([makePolicy('a'), makePolicy('b')]);
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('post-persist boom');
      return { id, version: `Wz${id}-after` };
    });
    (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) => {
      if (id === 'b') {
        // SO already holds the new ARN — the write landed, a later step rejected.
        return makePolicy('b', NEW_ARN);
      }
      return makePolicy(id);
    });

    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);

    const revertCalls = (packagePolicyService.update as jest.Mock).mock.calls.filter(
      ([, , , update]) => update.inputs[0].vars.role_arn.value === OLD_ARN
    );
    expect(revertCalls.map(([, , id]) => id).sort()).toEqual(['a', 'b']);
  });

  describe('when update() persisted the new Role ARN and then rejected', () => {
    beforeEach(() => {
      mockListReturns([makePolicy('a'), makePolicy('b')]);
      (packagePolicyService.update as jest.Mock).mockImplementation(
        async (_so, _es, id: string, update) => {
          if (id === 'b' && update.inputs[0].vars.role_arn.value === NEW_ARN) {
            throw new Error('post-persist boom');
          }
          return { id, version: `Wz${id}-after` };
        }
      );
    });

    const revertedIds = () =>
      (packagePolicyService.update as jest.Mock).mock.calls
        .filter(([, , , update]) => update.inputs[0].vars.role_arn.value === OLD_ARN)
        .map(([, , id]) => id)
        .sort();

    it('leaves the policy alone and reports it when another edit landed after the write', async () => {
      // The re-read version belongs to that edit, so restoring the snapshot with it would
      // silently erase the edit instead of hitting a version conflict.
      (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) =>
        id === 'b'
          ? { ...makePolicy('b', NEW_ARN), name: 'renamed-by-someone-else', version: 'Wzb-other' }
          : makePolicy(id)
      );

      await expect(
        propagateRoleArnToPackagePolicies({
          soClient,
          esClient,
          connectorId: CONNECTOR_ID,
          newRoleArn: NEW_ARN,
        })
      ).rejects.toMatchObject({ detail: { updateFailed: ['b'], revertFailed: ['b'] } });
      expect(revertedIds()).toEqual(['a']);
    });

    it('reverts the policy when only the compiled output differs from the write', async () => {
      (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) => {
        if (id !== 'b') {
          return makePolicy(id);
        }
        const persisted = makePolicy('b', NEW_ARN);
        return {
          ...persisted,
          version: 'Wzb-persisted',
          inputs: persisted.inputs.map((input) => ({ ...input, compiled_input: { compiled: 1 } })),
        };
      });

      await expect(
        propagateRoleArnToPackagePolicies({
          soClient,
          esClient,
          connectorId: CONNECTOR_ID,
          newRoleArn: NEW_ARN,
        })
      ).rejects.toMatchObject({ detail: { updateFailed: ['b'], revertFailed: [] } });
      expect(revertedIds()).toEqual(['a', 'b']);
      const revertOfB = (packagePolicyService.update as jest.Mock).mock.calls.find(
        ([, , id, update]) => id === 'b' && update.inputs[0].vars.role_arn.value === OLD_ARN
      );
      expect(revertOfB?.[3].version).toBe('Wzb-persisted');
    });

    it("reverts the policy when the re-read carries the installation's data stream features", async () => {
      // `packagePolicyService.get` adds these from the installation; `fetchAllItems` does not.
      (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) =>
        id === 'b'
          ? {
              ...makePolicy('b', NEW_ARN),
              version: 'Wzb-persisted',
              package: {
                ...PACKAGE,
                experimental_data_stream_features: [
                  { data_stream: 'logs-cloud_security_posture.findings', features: {} },
                ],
              },
            }
          : makePolicy(id)
      );

      await expect(
        propagateRoleArnToPackagePolicies({
          soClient,
          esClient,
          connectorId: CONNECTOR_ID,
          newRoleArn: NEW_ARN,
        })
      ).rejects.toMatchObject({ detail: { updateFailed: ['b'], revertFailed: [] } });
      expect(revertedIds()).toEqual(['a', 'b']);
    });
  });

  describe('when update() wrote the policy again after returning its version', () => {
    // With version-specific policies, update() stores `inputs_for_versions` in a second write
    // but returns the version read before it.
    const revertVersionOfA = async () => {
      const rollback = await propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      });
      (packagePolicyService.update as jest.Mock).mockClear();
      await rollback!.revert();
      const revertOfA = (packagePolicyService.update as jest.Mock).mock.calls.find(
        ([, , id]) => id === 'a'
      );
      return revertOfA?.[3].version;
    };

    beforeEach(() => {
      mockListReturns([makePolicy('a')]);
    });

    it('reverts with the version stored after that write', async () => {
      (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) => ({
        ...makePolicy(id, NEW_ARN),
        version: `Wz${id}-compiled`,
      }));

      expect(await revertVersionOfA()).toBe('Wza-compiled');
    });

    it('keeps the returned version when another edit landed after the write', async () => {
      // Reverting with that edit's version would erase it instead of hitting a conflict.
      (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) => ({
        ...makePolicy(id, NEW_ARN),
        name: 'renamed-by-someone-else',
        version: `Wz${id}-other`,
      }));

      expect(await revertVersionOfA()).toBe('Wza-after');
    });
  });

  it('does not revert when a failed update left the policy with no Role ARN fields', async () => {
    // `!rewrite(...).changed` is also true when every role_arn key was removed by a concurrent
    // edit; treating that as "persisted new ARN" would resurrect the stale snapshot on revert.
    mockListReturns([makePolicy('a'), makePolicy('b')]);
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('occ conflict');
      return { id, version: `Wz${id}-after` };
    });
    (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) => {
      if (id === 'b') {
        return {
          ...makePolicy('b'),
          inputs: [{ type: 'cloudbeat/cis_aws', enabled: true, vars: {}, streams: [] }],
        };
      }
      return makePolicy(id);
    });

    await expect(
      propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);

    const revertCalls = (packagePolicyService.update as jest.Mock).mock.calls.filter(
      ([, , , update]) => update.inputs[0].vars?.role_arn?.value === OLD_ARN
    );
    // Only `a` was successfully written and reverted; `b` must not be clobbered.
    expect(revertCalls.map(([, , id]) => id)).toEqual(['a']);
  });

  describe('when another writer already stored this Role ARN on a policy', () => {
    // Role ARN saves on one connector are serialized by a lock, so the other writer is not a
    // Role ARN save and has not committed the connector. This request still owns its own writes.
    beforeEach(() => {
      (packagePolicyService.get as jest.Mock).mockImplementation(async (_so, id: string) =>
        id === 'b' ? makePolicy('b', NEW_ARN) : makePolicy(id)
      );
    });

    const revertedIds = () =>
      (packagePolicyService.update as jest.Mock).mock.calls
        .filter(([, , , update]) => update.inputs[0].vars?.role_arn?.value === OLD_ARN)
        .map(([, , id]) => id)
        .sort();

    it('restores its own writes and reports the other policy when the connector write fails', async () => {
      mockListReturns([makePolicy('a'), makePolicy('b')]);
      (packagePolicyService.update as jest.Mock).mockImplementation(
        async (_so, _es, id: string, update) => {
          if (id === 'b' && update.inputs[0].vars.role_arn.value === NEW_ARN) {
            throw SavedObjectsErrorHelpers.createConflictError('ingest-package-policies', 'b');
          }
          return { id, version: `Wz${id}-after` };
        }
      );

      const rollback = await propagateRoleArnToPackagePolicies({
        soClient,
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      });
      expect(revertedIds()).toEqual([]);

      await expect(rollback?.revert()).rejects.toMatchObject({
        detail: { updateFailed: [], revertFailed: ['b'] },
      });
      expect(revertedIds()).toEqual(['a']);
    });

    it('restores its own writes when another policy also fails', async () => {
      mockListReturns([makePolicy('a'), makePolicy('b'), makePolicy('c')]);
      (packagePolicyService.update as jest.Mock).mockImplementation(
        async (_so, _es, id: string, update) => {
          if (update.inputs[0].vars.role_arn.value === NEW_ARN) {
            if (id === 'b') {
              throw SavedObjectsErrorHelpers.createConflictError('ingest-package-policies', 'b');
            }
            if (id === 'c') {
              throw new Error('boom');
            }
          }
          return { id, version: `Wz${id}-after` };
        }
      );

      await expect(
        propagateRoleArnToPackagePolicies({
          soClient,
          esClient,
          connectorId: CONNECTOR_ID,
          newRoleArn: NEW_ARN,
        })
      ).rejects.toMatchObject({ detail: { updateFailed: ['c'], revertFailed: ['b'] } });
      expect(revertedIds()).toEqual(['a']);
    });
  });
});
