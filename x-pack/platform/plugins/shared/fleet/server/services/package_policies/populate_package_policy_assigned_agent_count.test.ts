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
    esClientMock.esql.query.mockResolvedValue({
      values: [
        [100, 'agent-policy-id-a'],
        [50, 'agent-policy-id-b'],
      ],
    } as any);

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
