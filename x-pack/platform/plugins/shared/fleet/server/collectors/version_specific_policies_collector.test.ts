/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../services/agent_policy';
import { appContextService } from '../services';
import { AGENT_VERSION_SUFFIX_ES_REGEXP } from '../../common/services/version_specific_policies_utils';
import { POLICY_ID_FIXTURES } from '../../common/services/version_specific_policy_id_fixtures';

import { getVersionSpecificPoliciesUsage } from './version_specific_policies_collector';

jest.mock('../services');
jest.mock('../services/agent_policy', () => ({
  agentPolicyService: { fetchAllAgentPolicies: jest.fn() },
  getAgentPolicySavedObjectType: jest.fn().mockResolvedValue('fleet-agent-policies'),
}));
jest.mock('../services/package_policy', () => ({
  getPackagePolicySavedObjectType: jest.fn().mockResolvedValue('fleet-package-policies'),
}));

describe('getVersionSpecificPoliciesUsage', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(appContextService.getLogger).mockReturnValue(loggingSystemMock.createLogger());
    jest.mocked(agentPolicyService.fetchAllAgentPolicies).mockResolvedValue(
      (async function* () {
        yield [];
      })()
    );
    esClient.search.mockResolvedValue({
      aggregations: {
        versions: {
          buckets: [
            { key: '9.4.0', doc_count: 3 },
            { key: '9.3.1', doc_count: 1 },
          ],
        },
      },
    } as any);
  });

  it('counts only the active agents on policies with an agent version suffix', async () => {
    await getVersionSpecificPoliciesUsage(soClient, esClient);

    const { query } = esClient.search.mock.calls[0][0] as any;
    expect(query).toEqual({
      bool: {
        filter: [
          { term: { active: 'true' } },
          { regexp: { policy_id: AGENT_VERSION_SUFFIX_ES_REGEXP } },
        ],
      },
    });
  });

  it('does not match the #sentinel policy or policy ids that only contain a #', async () => {
    await getVersionSpecificPoliciesUsage(soClient, esClient);

    const { query } = esClient.search.mock.calls[0][0] as any;
    const regexp = new RegExp(`^(?:${query.bool.filter[1].regexp.policy_id})$`);
    const matching = POLICY_ID_FIXTURES.filter(({ policyId }) => regexp.test(policyId));

    expect(matching.length).toBeGreaterThan(0);
    expect(matching.every(({ kind }) => kind === 'agentVersion')).toBe(true);
    expect(matching.map(({ policyId }) => policyId)).not.toContain('policy1#sentinel');
    expect(matching.map(({ policyId }) => policyId)).not.toContain('policy#1');
  });

  it('returns the agents per agent version', async () => {
    const usage = await getVersionSpecificPoliciesUsage(soClient, esClient);

    expect(usage.agents_on_version_specific_policies_per_version).toEqual([
      { agent_version: '9.4.0', count: 3 },
      { agent_version: '9.3.1', count: 1 },
    ]);
  });
});
