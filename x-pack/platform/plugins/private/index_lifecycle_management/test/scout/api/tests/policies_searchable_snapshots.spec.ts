/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import {
  API_BASE_PATH,
  CLOUD_REPOSITORY_NAME,
  ILM_API_ROLE,
  NEVER_FIRING_SCHEDULE,
  getHeaders,
  getResourceName,
} from '../fixtures/constants';
import { deletePolicy, getPolicyPayloadWithSearchableSnapshots } from '../fixtures/policies';

// Runs on local and Cloud. Locally we register a file system (`fs`) repository; Cloud forbids
// those, so we reuse the managed `found-snapshots` repository instead.
apiTest.describe(
  'Index Lifecycle Management - policies with searchable snapshots',
  { tag: tags.stateful.classic },
  () => {
    let credentials: RoleApiCredentials;
    let repository: string;
    const localRepository = getResourceName('repo');
    const slmPolicy = getResourceName('slm-policy');
    const policyName = getResourceName('searchable-snapshot-policy');

    apiTest.beforeAll(async ({ requestAuth, esClient, config }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);

      if (config.isCloud) {
        repository = CLOUD_REPOSITORY_NAME;
      } else {
        repository = localRepository;
        await esClient.snapshot.createRepository({
          name: repository,
          repository: { type: 'fs', settings: { location: `/tmp/repo/${repository}` } },
          verify: false,
        });
      }
      await esClient.slm.putLifecycle({
        policy_id: slmPolicy,
        name: slmPolicy,
        schedule: NEVER_FIRING_SCHEDULE,
        repository,
        config: { indices: [`${slmPolicy}-*`] },
      });
    });

    apiTest.afterAll(async ({ esClient, config }) => {
      await deletePolicy(esClient, policyName);
      await esClient.slm.deleteLifecycle({ policy_id: slmPolicy }, { ignore: [404] });
      if (!config.isCloud) {
        await esClient.snapshot.deleteRepository({ name: localRepository }, { ignore: [404] });
      }
    });

    apiTest(
      'creates a lifecycle policy with a searchable snapshot action',
      async ({ apiClient, esClient }) => {
        const { name, ...policy } = getPolicyPayloadWithSearchableSnapshots(policyName, {
          repository,
          slmPolicy,
        });

        const response = await apiClient.post(`${API_BASE_PATH}/policies`, {
          headers: getHeaders(credentials),
          responseType: 'json',
          body: { name, ...policy },
        });

        expect(response).toHaveStatusCode(200);
        const policyFromEs = await esClient.ilm.getLifecycle({ name });
        const { phases } = policyFromEs[name].policy;
        expect(phases.cold?.actions?.searchable_snapshot?.snapshot_repository).toBe(repository);
        expect(phases.frozen?.actions?.searchable_snapshot?.snapshot_repository).toBe(repository);
        expect(phases.delete?.actions?.wait_for_snapshot?.policy).toBe(slmPolicy);
      }
    );
  }
);
