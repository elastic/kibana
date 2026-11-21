/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { RequestHandler, SavedObjectsClient } from '@kbn/core/server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '../../../common/constants';
import { OsqueryAppContextService } from '../../lib/osquery_app_context_services';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getAgentPoliciesRoute } from './get_agent_policies';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('getAgentPoliciesRoute integration ownership', () => {
  const spaceScopedClient = savedObjectsClientMock.create();
  const packagePolicyService = { list: jest.fn(), fetchAllItems: jest.fn() };
  const getByIds = jest.fn();
  let routeHandler: RequestHandler;
  let visiblePolicyIds: string[];
  const getAgentStatusForAgentPolicy = jest.fn();
  const asInternalScopedUser = jest.fn();

  const makePackagePolicy = (id: string, policyIds: string[], version = '1.0.0') => ({
    id,
    name: `Integration ${id}`,
    policy_ids: policyIds,
    package: { name: 'osquery_manager', version },
  });

  const setPackagePolicies = (pages: ReturnType<typeof makePackagePolicy>[][]) => {
    packagePolicyService.list.mockResolvedValue({ items: pages.flat().slice(0, 1000) });
    packagePolicyService.fetchAllItems.mockImplementation(async function* () {
      yield* pages;
    });
  };

  const runRoute = async () => {
    const response = httpServerMock.createResponseFactory();
    await routeHandler({} as never, httpServerMock.createKibanaRequest(), response);

    return response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    visiblePolicyIds = ['A', 'B', 'C'];
    getByIds.mockImplementation(
      async (_client, ids: string[], options?: { ignoreMissing?: boolean }) => {
        if (!options?.ignoreMissing && ids.some((id) => !visiblePolicyIds.includes(id))) {
          throw new Error('Agent policy not found');
        }

        return ids
          .filter((id) => visiblePolicyIds.includes(id))
          .map((id) => ({ id, name: `Policy ${id}` }));
      }
    );
    getAgentStatusForAgentPolicy.mockResolvedValue({ active: 7 });
    asInternalScopedUser.mockReturnValue({ getAgentStatusForAgentPolicy });
    jest
      .mocked(createInternalSavedObjectsClientForSpaceId)
      .mockResolvedValue(spaceScopedClient as unknown as SavedObjectsClient);
    setPackagePolicies([[makePackagePolicy('shared', ['A', 'B', 'C'])]]);

    const service = new OsqueryAppContextService();
    jest.spyOn(service, 'getActiveSpace').mockResolvedValue({
      id: brandSpaceId('test-space'),
      name: 'Test',
      disabledFeatures: [],
    });
    jest.spyOn(service, 'getPackagePolicyService').mockReturnValue(packagePolicyService as never);
    jest.spyOn(service, 'getAgentPolicyService').mockReturnValue({ getByIds } as never);
    jest.spyOn(service, 'getAgentService').mockReturnValue({ asInternalScopedUser } as never);

    const router = httpServiceMock.createSetupContract().createRouter();
    getAgentPoliciesRoute(router, { service } as OsqueryAppContext);
    const route = router.versioned.getRoute(
      'get',
      '/internal/osquery/fleet_wrapper/agent_policies'
    );
    const version = route.versions[API_VERSIONS.internal.v1];
    if (!version) {
      throw new Error('Agent policies route version not found');
    }

    routeHandler = version.handler;
  });

  it('drains 1200 integrations across several fetchAllItems batches', async () => {
    visiblePolicyIds = Array.from({ length: 1200 }, (_, index) => `policy-${index}`);
    const policies = visiblePolicyIds.map((id, index) => makePackagePolicy(`pp-${index}`, [id]));
    setPackagePolicies([policies.slice(0, 400), policies.slice(400, 800), policies.slice(800)]);

    const response = await runRoute();

    expect(response.ok.mock.calls[0][0]?.body).toHaveLength(1200);
    expect(response.ok).toHaveBeenCalledWith({
      body: visiblePolicyIds.map((id, index) => ({
        id,
        name: `Policy ${id}`,
        agents: 7,
        package_policy_id: `pp-${index}`,
        package_policy_name: `Integration pp-${index}`,
        osquery_package_policies: [{ id: `pp-${index}`, name: `Integration pp-${index}` }],
      })),
    });
    expect(packagePolicyService.fetchAllItems).toHaveBeenCalledTimes(1);
    expect(packagePolicyService.fetchAllItems).toHaveBeenCalledWith(spaceScopedClient, {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:osquery_manager`,
    });
    expect(packagePolicyService.list).not.toHaveBeenCalled();
  });

  it('includes the same integration metadata for all three shared owners and retains counts', async () => {
    const response = await runRoute();

    expect(response.ok).toHaveBeenCalledWith({
      body: ['A', 'B', 'C'].map((id) => ({
        id,
        name: `Policy ${id}`,
        agents: 7,
        package_policy_id: 'shared',
        package_policy_name: 'Integration shared',
        osquery_package_policies: [{ id: 'shared', name: 'Integration shared' }],
      })),
    });
    expect(asInternalScopedUser).toHaveBeenCalledWith('test-space');
  });

  it('preserves both integrations when an agent policy owns overlapping integrations', async () => {
    setPackagePolicies([
      [makePackagePolicy('pp1', ['A', 'B'])],
      [makePackagePolicy('pp2', ['A', 'C'])],
    ]);

    const response = await runRoute();

    expect(response.ok).toHaveBeenCalledWith({
      body: [
        expect.objectContaining({
          id: 'A',
          osquery_package_policies: [
            { id: 'pp1', name: 'Integration pp1' },
            { id: 'pp2', name: 'Integration pp2' },
          ],
        }),
        expect.objectContaining({
          id: 'B',
          osquery_package_policies: [{ id: 'pp1', name: 'Integration pp1' }],
        }),
        expect.objectContaining({
          id: 'C',
          osquery_package_policies: [{ id: 'pp2', name: 'Integration pp2' }],
        }),
      ],
    });
    // Ambiguous with two integrations, so the singular fields are omitted.
    const [policyA] = response.ok.mock.calls[0][0]?.body as Array<Record<string, unknown>>;
    expect(policyA).not.toHaveProperty('package_policy_id');
    expect(policyA).not.toHaveProperty('package_policy_name');
  });

  it('excludes integrations below 0.6.0 while including the supported boundary', async () => {
    setPackagePolicies([
      [
        makePackagePolicy('old', ['A', 'B'], '0.5.9'),
        makePackagePolicy('new', ['B', 'C'], '0.6.0'),
      ],
    ]);

    const response = await runRoute();

    expect(getByIds).toHaveBeenCalledWith(spaceScopedClient, ['B', 'C'], { ignoreMissing: true });
    expect(response.ok).toHaveBeenCalledWith({
      body: ['B', 'C'].map((id) =>
        expect.objectContaining({
          id,
          package_policy_id: 'new',
          package_policy_name: 'Integration new',
          osquery_package_policies: [{ id: 'new', name: 'Integration new' }],
        })
      ),
    });
  });

  it('omits missing or cross-space policies using the scoped lookup with ignoreMissing', async () => {
    visiblePolicyIds = ['A'];

    const response = await runRoute();

    expect(getByIds).toHaveBeenCalledWith(spaceScopedClient, ['A', 'B', 'C'], {
      ignoreMissing: true,
    });
    expect(response.ok).toHaveBeenCalledWith({ body: [expect.objectContaining({ id: 'A' })] });
    expect(getAgentStatusForAgentPolicy).toHaveBeenCalledTimes(1);
    expect(getAgentStatusForAgentPolicy).toHaveBeenCalledWith('A');
  });
});
