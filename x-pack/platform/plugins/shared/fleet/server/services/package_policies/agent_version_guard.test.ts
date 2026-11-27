/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { PackagePolicyAgentVersionIncompatibleError } from '../../errors';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { getPackageInfo } from '../epm/packages';
import { getVariantPolicyIdsForParents } from '../utils/version_specific_policies';

import {
  assertAgentVersionCompatible,
  buildAgentVersionConditionAgentsFilter,
  buildActiveAgentsOfPolicyFilter,
  createAgentVersionIncompatibleError,
  getAgentVersionBlockMessage,
  getAgentVersionBlocks,
  getAgentVersionBlocksOrErrors,
  getAgentVersionGuardScope,
  getCurrentAgentVersionCondition,
  redactAgentVersionBlock,
  redactAgentVersionIncompatibleError,
} from './agent_version_guard';

jest.mock('../app_context');
jest.mock('../agent_policy');
jest.mock('../epm/packages');
jest.mock('../utils/version_specific_policies');

const mockedAppContextService = jest.mocked(appContextService);
const mockedGetByIds = jest.mocked(agentPolicyService.getByIds);
const esClient = elasticsearchServiceMock.createElasticsearchClient();

const pkgInfo = (versionCondition?: string) => ({
  name: 'aws_mq',
  version: '2.3.0',
  conditions: versionCondition ? { agent: { version: versionCondition } } : undefined,
});

const mockAgentVersions = (versionsByPolicy: Record<string, Record<string, number>>) =>
  esClient.search.mockResolvedValue({
    aggregations: {
      policies: {
        buckets: Object.fromEntries(
          Object.entries(versionsByPolicy).map(([policyId, versions]) => [
            policyId,
            {
              versions: {
                buckets: Object.entries(versions).map(([key, docCount]) => ({
                  key,
                  doc_count: docCount,
                })),
              },
            },
          ])
        ),
      },
    },
  } as never);

describe('agent_version_guard', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedAppContextService.getExperimentalFeatures.mockReturnValue({
      enableVersionSpecificPolicies: true,
    } as ReturnType<typeof appContextService.getExperimentalFeatures>);
    mockedAppContextService.getInternalUserESClient.mockReturnValue(esClient);
    jest.mocked(getVariantPolicyIdsForParents).mockResolvedValue(new Map());
    mockedGetByIds.mockImplementation(
      async (_soClient, ids) =>
        ids.map((id) => ({
          id: typeof id === 'string' ? id : id.id,
          supports_agentless: false,
        })) as Awaited<ReturnType<typeof agentPolicyService.getByIds>>
    );
  });

  describe('getAgentVersionBlocks', () => {
    it('blocks when some active agents do not satisfy the condition', async () => {
      mockAgentVersions({ 'policy-1': { '9.3.1': 2, '9.4.2': 5 } });

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.get('pp-1')).toEqual({
        package_name: 'aws_mq',
        package_version: '2.3.0',
        version_condition: '^9.4.0',
        blocked_count: 2,
        observed_versions: ['9.3.1'],
        min_version: '9.4.0',
      });
      expect(esClient.search).toHaveBeenCalledTimes(1);
    });

    it('does not count the agents that already lack the inputs under the current condition', async () => {
      mockAgentVersions({
        'policy-1': { '9.2.0': 1, '9.3.1': 2, '9.4.2': 5 },
        'policy-2': { '9.2.0': 3 },
      });

      const blocks = await getAgentVersionBlocks([
        {
          key: 'pp-1',
          pkgInfo: pkgInfo('^9.4.0'),
          agentPolicyIds: ['policy-1', 'policy-2'],
          // policy-2 is added by the update, so its agents never had the inputs to lose
          currentCondition: { versionCondition: '^9.3.0', agentPolicyIds: ['policy-1'] },
        },
      ]);

      expect(blocks.get('pp-1')).toEqual(
        expect.objectContaining({ blocked_count: 5, observed_versions: ['9.2.0', '9.3.1'] })
      );
    });

    it('does not block when the current condition already excludes every blocked agent', async () => {
      mockAgentVersions({ 'policy-1': { '9.3.1': 2, '9.4.2': 5 } });

      const blocks = await getAgentVersionBlocks([
        {
          key: 'pp-1',
          pkgInfo: pkgInfo('^9.4.0'),
          agentPolicyIds: ['policy-1'],
          currentCondition: { versionCondition: '^9.4.0', agentPolicyIds: ['policy-1'] },
        },
      ]);

      expect(blocks.size).toBe(0);
    });

    it('queries the agents without expensive queries', async () => {
      mockAgentVersions({});

      await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      // `search.allow_expensive_queries: false` rejects runtime fields and wildcard queries
      const [request] = esClient.search.mock.calls[0];
      expect(request).not.toHaveProperty('runtime_mappings');
      expect(JSON.stringify(request)).not.toMatch(/wildcard|query_string|"status"|\*/);
    });

    it('queries the agents of at most 50 agent policies at a time', async () => {
      mockAgentVersions({ 'policy-0': { '9.3.0': 1 }, 'policy-59': { '9.3.0': 2 } });
      const agentPolicyIds = Array.from({ length: 60 }, (_, i) => `policy-${i}`);

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds },
      ]);

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(blocks.get('pp-1')).toEqual(expect.objectContaining({ blocked_count: 3 }));
    });

    it('propagates a failure to query the agents', async () => {
      esClient.search.mockRejectedValue(new Error('boom'));

      await expect(
        getAgentVersionBlocks([
          { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
        ])
      ).rejects.toThrow('boom');
    });

    it('only counts the active non-OpAMP agents of the agent policy and its variants', () => {
      expect(buildActiveAgentsOfPolicyFilter('policy-1', 3600, ['policy-1#9.3'])).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { term: { policy_base_id: 'policy-1' } },
                  // An older Fleet Server may not set `policy_base_id`, even on a variant
                  {
                    bool: {
                      filter: [{ terms: { policy_id: ['policy-1', 'policy-1#9.3'] } }],
                      must_not: [{ exists: { field: 'policy_base_id' } }],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            { term: { active: true } },
          ],
          must_not: [
            { term: { type: 'OPAMP' } },
            { term: { audit_unenrolled_reason: 'uninstall' } },
            { exists: { field: 'unenrollment_started_at' } },
            { range: { last_checkin: { lt: 'now-3600s' } } },
            {
              bool: {
                filter: [{ range: { enrolled_at: { lt: 'now-3600s' } } }],
                must_not: [{ exists: { field: 'last_checkin' } }],
              },
            },
          ],
        },
      });
    });

    it('does not exclude inactive agents of an agent policy without inactivity timeout', () => {
      expect(JSON.stringify(buildActiveAgentsOfPolicyFilter('policy-1'))).not.toContain(
        'last_checkin'
      );
    });

    it('applies the same rules as the agent counts shown in the UI', () => {
      const { filter, must_not: mustNot } = buildAgentVersionConditionAgentsFilter(3600);

      expect(buildActiveAgentsOfPolicyFilter('policy-1', 3600)).toMatchObject({
        bool: { filter: expect.arrayContaining(filter), must_not: mustNot },
      });
    });

    it('matches the known version-specific variants of the agent policies', async () => {
      mockAgentVersions({});
      jest
        .mocked(getVariantPolicyIdsForParents)
        .mockResolvedValue(new Map([['policy-1', ['policy-1#9.3']]]));

      await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(getVariantPolicyIdsForParents).toHaveBeenCalledWith(esClient, ['policy-1']);
      expect(JSON.stringify(esClient.search.mock.calls[0][0])).toContain('policy-1#9.3');
    });

    it('does not block when every agent satisfies the condition', async () => {
      mockAgentVersions({ 'policy-1': { '9.4.0': 2 } });

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.size).toBe(0);
    });

    it('does not block an agent policy without active agents', async () => {
      mockAgentVersions({});

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.size).toBe(0);
    });

    it('evaluates agents at their major.minor, as version-specific policies do', async () => {
      mockAgentVersions({ 'policy-1': { '9.4.8': 40 } });

      const blocks = await getAgentVersionBlocks([
        {
          key: 'pp-1',
          pkgInfo: pkgInfo('~9.4.6 || ~9.5.3 || ^9.6.0'),
          agentPolicyIds: ['policy-1'],
        },
      ]);

      expect(blocks.get('pp-1')).toEqual(
        expect.objectContaining({ blocked_count: 40, observed_versions: ['9.4.8'] })
      );
      expect(blocks.get('pp-1')?.min_version).toBe('9.6.0');
    });

    it('sums the agents across the agent policies of each item with a single query', async () => {
      mockAgentVersions({ 'policy-1': { '9.3.0': 1 }, 'policy-2': { '9.3.0': 2, '9.2.0': 1 } });

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1', 'policy-2'] },
        { key: 'pp-2', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.get('pp-1')).toEqual(
        expect.objectContaining({ blocked_count: 4, observed_versions: ['9.2.0', '9.3.0'] })
      );
      expect(blocks.get('pp-2')).toEqual(expect.objectContaining({ blocked_count: 1 }));
      expect(esClient.search).toHaveBeenCalledTimes(1);
    });

    it('ignores packages without an agent version condition', async () => {
      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo(), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.size).toBe(0);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('ignores agentless agent policies', async () => {
      mockedGetByIds.mockResolvedValue([{ id: 'policy-1', supports_agentless: true }] as never);

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.size).toBe(0);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('does nothing when version-specific policies are disabled', async () => {
      mockedAppContextService.getExperimentalFeatures.mockReturnValue({
        enableVersionSpecificPolicies: false,
      } as ReturnType<typeof appContextService.getExperimentalFeatures>);

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.size).toBe(0);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('blocks every agent when the condition is not a valid range', async () => {
      mockAgentVersions({ 'policy-1': { '9.6.0': 3 } });

      const blocks = await getAgentVersionBlocks([
        { key: 'pp-1', pkgInfo: pkgInfo('not a range'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.get('pp-1')).toEqual(expect.objectContaining({ blocked_count: 3 }));
    });
  });

  describe('getAgentVersionBlocksOrErrors', () => {
    it('returns the blocks', async () => {
      mockAgentVersions({ 'policy-1': { '9.3.1': 2 } });

      const { blocks, errors } = await getAgentVersionBlocksOrErrors([
        { key: 'pp-1', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.has('pp-1')).toBe(true);
      expect(errors.size).toBe(0);
    });

    it('returns the error for the items that needed the agents when they cannot be queried', async () => {
      const error = new Error('boom');
      esClient.search.mockRejectedValue(error);

      const { blocks, errors } = await getAgentVersionBlocksOrErrors([
        { key: 'with-condition', pkgInfo: pkgInfo('^9.4.0'), agentPolicyIds: ['policy-1'] },
        { key: 'without-condition', pkgInfo: pkgInfo(), agentPolicyIds: ['policy-1'] },
      ]);

      expect(blocks.size).toBe(0);
      expect(errors).toEqual(new Map([['with-condition', error]]));
    });
  });

  describe('assertAgentVersionCompatible', () => {
    it('throws an error carrying the block', async () => {
      mockAgentVersions({ 'policy-1': { '9.3.1': 2 } });

      const promise = assertAgentVersionCompatible({
        pkgInfo: pkgInfo('^9.4.0'),
        agentPolicyIds: ['policy-1'],
        operation: 'upgrade',
      });

      await expect(promise).rejects.toThrow(PackagePolicyAgentVersionIncompatibleError);
      await expect(promise).rejects.toThrow(
        "Cannot upgrade aws_mq to 2.3.0: it requires agent version ^9.4.0, and 2 active agents on 9.3.1 don't satisfy it."
      );
    });

    it('does not throw when the agents satisfy the condition', async () => {
      mockAgentVersions({ 'policy-1': { '9.4.1': 2 } });

      await expect(
        assertAgentVersionCompatible({
          pkgInfo: pkgInfo('^9.4.0'),
          agentPolicyIds: ['policy-1'],
          operation: 'add',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('getAgentVersionBlockMessage', () => {
    const block = {
      package_name: 'azure_billing',
      package_version: '1.13.0',
      version_condition: '~9.4.6 || ~9.5.3 || ^9.6.0',
      blocked_count: 40,
      observed_versions: ['9.4.8'],
    };

    it('names the observed versions and omits the upgrade target when there is none', () => {
      const message = getAgentVersionBlockMessage(block, 'upgrade');
      expect(message).toContain(
        "Cannot upgrade azure_billing to 1.13.0: it requires agent version ~9.4.6 || ~9.5.3 || ^9.6.0, and 40 active agents on 9.4.8 don't satisfy it."
      );
      expect(message).not.toContain('Upgrade the agents to');
    });

    it('suggests the minimum version when the agents run below it', () => {
      expect(
        getAgentVersionBlockMessage(
          { ...block, observed_versions: ['9.3.0'], min_version: '9.6.0' },
          'add'
        )
      ).toContain('Upgrade the agents to a version that satisfies it, such as 9.6.0.');
    });

    it('says the agents would stop collecting the data on upgrade', () => {
      expect(getAgentVersionBlockMessage(block, 'upgrade')).toContain(
        "Those agents would stop collecting this integration's data."
      );
    });

    it("says the agents won't collect the data on add", () => {
      expect(getAgentVersionBlockMessage(block, 'add')).toContain(
        "Those agents won't collect this integration's data."
      );
    });

    it('caps the number of listed versions', () => {
      const observedVersions = Array.from({ length: 12 }, (_, i) => `8.${i}.0`);
      expect(
        getAgentVersionBlockMessage({ ...block, observed_versions: observedVersions }, 'add')
      ).toContain('8.9.0 and 2 more');
    });

    it('does not describe the agents of a redacted block', () => {
      const message = getAgentVersionBlockMessage(
        redactAgentVersionBlock({ ...block, min_version: '9.6.0' }),
        'add'
      );

      expect(message).toContain(
        "Cannot add azure_billing 1.13.0 to the selected agent policies: it requires agent version ~9.4.6 || ~9.5.3 || ^9.6.0, and some active agents don't satisfy it."
      );
      expect(message).not.toContain('9.4.8');
      expect(message).not.toContain('9.6.0.');
    });
  });

  describe('redactAgentVersionIncompatibleError', () => {
    it('removes the agent inventory from the error', () => {
      const error = createAgentVersionIncompatibleError(
        {
          package_name: 'aws_mq',
          package_version: '2.3.0',
          version_condition: '^9.4.0',
          blocked_count: 2,
          observed_versions: ['9.3.1'],
          min_version: '9.4.0',
        },
        'upgrade'
      );

      const redacted = redactAgentVersionIncompatibleError(error);

      expect(redacted).toBeInstanceOf(PackagePolicyAgentVersionIncompatibleError);
      expect(redacted.message).not.toContain('9.3.1');
      expect(redacted.message).toContain('Cannot upgrade aws_mq to 2.3.0');
      expect((redacted as PackagePolicyAgentVersionIncompatibleError).attributes).toEqual({
        type: 'agent_version_incompatible',
        agent_version_block: {
          package_name: 'aws_mq',
          package_version: '2.3.0',
          version_condition: '^9.4.0',
        },
      });
    });

    it('returns other errors unchanged', () => {
      const error = new Error('boom');

      expect(redactAgentVersionIncompatibleError(error)).toBe(error);
    });
  });

  describe('getAgentVersionGuardScope', () => {
    it('checks every agent policy when the package version changes', () => {
      expect(
        getAgentVersionGuardScope({
          oldPackageVersion: '1.0.0',
          newPackageVersion: '1.1.0',
          oldPolicyIds: ['policy-1'],
          newPolicyIds: ['policy-1', 'policy-2'],
        })
      ).toEqual({ agentPolicyIds: ['policy-1', 'policy-2'], operation: 'upgrade' });
    });

    it('checks only the added agent policies when the package version is unchanged', () => {
      expect(
        getAgentVersionGuardScope({
          oldPackageVersion: '1.0.0',
          newPackageVersion: '1.0.0',
          oldPolicyIds: ['policy-1'],
          newPolicyIds: ['policy-1', 'policy-2'],
        })
      ).toEqual({ agentPolicyIds: ['policy-2'], operation: 'add' });
    });

    it('passes the current condition for the agent policies that already have the package policy', () => {
      expect(
        getAgentVersionGuardScope({
          oldPackageVersion: '1.0.0',
          newPackageVersion: '1.1.0',
          oldPolicyIds: ['policy-1', 'policy-3'],
          newPolicyIds: ['policy-1', 'policy-2'],
          oldVersionCondition: '^9.3.0',
        })
      ).toEqual({
        agentPolicyIds: ['policy-1', 'policy-2'],
        operation: 'upgrade',
        currentCondition: { versionCondition: '^9.3.0', agentPolicyIds: ['policy-1'] },
      });
    });

    it('does not check other edits', () => {
      expect(
        getAgentVersionGuardScope({
          oldPackageVersion: '1.0.0',
          newPackageVersion: '1.0.0',
          oldPolicyIds: ['policy-1', 'policy-2'],
          newPolicyIds: ['policy-1'],
        })
      ).toBeUndefined();
    });
  });

  describe('getCurrentAgentVersionCondition', () => {
    const soClient = savedObjectsClientMock.create();

    it('returns the condition of the current package version', async () => {
      jest.mocked(getPackageInfo).mockResolvedValue({
        conditions: { agent: { version: '^9.3.0' } },
      } as Awaited<ReturnType<typeof getPackageInfo>>);

      await expect(
        getCurrentAgentVersionCondition(soClient, { name: 'aws_mq', version: '2.0.1' })
      ).resolves.toBe('^9.3.0');
      expect(getPackageInfo).toHaveBeenCalledWith(
        expect.objectContaining({ pkgName: 'aws_mq', pkgVersion: '2.0.1' })
      );
    });

    it('returns undefined when the package cannot be read, so that every agent is checked', async () => {
      mockedAppContextService.getLogger.mockReturnValue(loggingSystemMock.createLogger());
      jest.mocked(getPackageInfo).mockRejectedValue(new Error('not found'));

      await expect(
        getCurrentAgentVersionCondition(soClient, { name: 'aws_mq', version: '2.0.1' })
      ).resolves.toBeUndefined();
    });
  });
});
