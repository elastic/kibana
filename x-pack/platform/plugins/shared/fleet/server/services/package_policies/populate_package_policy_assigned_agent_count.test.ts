/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import type { PackagePolicy } from '../../../common';

import { populatePackagePolicyAssignedAgentsCount } from './populate_package_policy_assigned_agents_count';

describe('When using populatePackagePolicyAssignedAgentCount()', () => {
  let esClientMock: ElasticsearchClientMock;
  let packagePolicies: PackagePolicy[];

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClientMock.search.mockImplementation(async () => {
      return {
        took: 3,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 100,
          max_score: 0,
          hits: [],
        },
        aggregations: {
          agent_counts: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'agent-policy-id-a',
                doc_count: 100,
              },
              {
                key: 'agent-policy-id-b',
                doc_count: 50,
              },
            ],
          },
        },
      };
    });

    packagePolicies = Array.from({ length: 15 }, (_, n) => {
      const now = new Date().toISOString();
      const policyId = `agent-policy-id-${n % 2 > 0 ? 'a' : 'b'}`;
      return {
        id: `package-policy-${n}`,
        name: `Package Policy ${n}`,
        description: '',
        created_at: now,
        created_by: 'elastic',
        updated_at: now,
        updated_by: 'elastic',
        policy_id: policyId,
        policy_ids: [policyId],
        enabled: true,
        inputs: [],
        namespace: 'default',
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
        revision: 1,
      };
    });
  });

  it('should add `agents` property to each package policy', async () => {
    await populatePackagePolicyAssignedAgentsCount(esClientMock, packagePolicies);

    packagePolicies.forEach((packagePolicy, index) => {
      const expectedCount = index % 2 > 0 ? 100 : 50;

      expect(packagePolicy.agents).toEqual(expectedCount);
    });
  });
});
