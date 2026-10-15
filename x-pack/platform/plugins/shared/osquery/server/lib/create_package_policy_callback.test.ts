/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, SavedObjectsClientContract } from '@kbn/core/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';

import { getInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { updateGlobalPacksCreateCallback } from './update_global_packs';
import { packSavedObjectType } from '../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import { getPackagePolicyCreateCallback } from './create_package_policy_callback';

jest.mock('../utils/get_internal_saved_object_client');
jest.mock('./update_global_packs');

const getInternalSavedObjectsClientForSpaceIdMock =
  getInternalSavedObjectsClientForSpaceId as jest.MockedFunction<
    typeof getInternalSavedObjectsClientForSpaceId
  >;
const updateGlobalPacksCreateCallbackMock = updateGlobalPacksCreateCallback as jest.MockedFunction<
  typeof updateGlobalPacksCreateCallback
>;

const buildSoClient = (spaceId: string | undefined): SavedObjectsClientContract =>
  ({
    getCurrentNamespace: jest.fn().mockReturnValue(spaceId),
  } as unknown as SavedObjectsClientContract);

const buildNewPackagePolicy = (packageName: string): NewPackagePolicy =>
  ({
    name: 'osquery-integration',
    namespace: 'default',
    enabled: true,
    policy_ids: ['agent-policy-1'],
    package: { name: packageName, title: 'Osquery Manager', version: '1.30.0' },
    inputs: [],
  } as unknown as NewPackagePolicy);

describe('getPackagePolicyCreateCallback', () => {
  const core = {} as CoreStart;
  const osqueryContext = {} as OsqueryAppContextService;
  let initialize: jest.Mock;
  let spaceScopedClient: { find: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    initialize = jest.fn().mockResolvedValue(undefined);

    // A single space-scoped client instance is returned; assertions below verify
    // that BOTH the pack `find` and the pack `update` use this same instance.
    spaceScopedClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: 'pack-so-id',
            attributes: { name: 'global-pack', shards: [{ key: '*', value: 100 }], queries: [] },
            references: [],
          },
        ],
      }),
    };
    getInternalSavedObjectsClientForSpaceIdMock.mockReturnValue(
      spaceScopedClient as unknown as ReturnType<typeof getInternalSavedObjectsClientForSpaceId>
    );
    updateGlobalPacksCreateCallbackMock.mockImplementation(
      async (packagePolicy) =>
        packagePolicy as Awaited<ReturnType<typeof updateGlobalPacksCreateCallback>>
    );
  });

  it('looks packs up and updates them with the SAME client scoped to the current (custom) space', async () => {
    const soClient = buildSoClient('custom-space');
    const callback = getPackagePolicyCreateCallback(core, osqueryContext, initialize, false);

    await callback(buildNewPackagePolicy(OSQUERY_INTEGRATION_NAME), soClient);

    // Regression guard for https://github.com/elastic/kibana/issues/278436:
    // the client must be scoped to the current namespace, not the default space.
    expect(getInternalSavedObjectsClientForSpaceIdMock).toHaveBeenCalledTimes(1);
    expect(getInternalSavedObjectsClientForSpaceIdMock).toHaveBeenCalledWith(core, 'custom-space');

    // The pack lookup uses the space-scoped client.
    expect(spaceScopedClient.find).toHaveBeenCalledWith({ type: packSavedObjectType });

    // The pack update uses the exact same space-scoped client and space id.
    expect(updateGlobalPacksCreateCallbackMock).toHaveBeenCalledTimes(1);
    const [, clientPassedToUpdate, , , spaceIdPassedToUpdate] =
      updateGlobalPacksCreateCallbackMock.mock.calls[0];
    expect(clientPassedToUpdate).toBe(spaceScopedClient);
    expect(spaceIdPassedToUpdate).toBe('custom-space');
  });

  it('uses an undefined space id (default space) when the request is in the default space', async () => {
    // In the default space Fleet's SO client returns `undefined` from
    // `getCurrentNamespace()` (not the string `'default'`), so the callback must
    // forward `undefined` unchanged to both the client factory and the update.
    const soClient = buildSoClient(undefined);
    const callback = getPackagePolicyCreateCallback(core, osqueryContext, initialize, false);

    await callback(buildNewPackagePolicy(OSQUERY_INTEGRATION_NAME), soClient);

    expect(getInternalSavedObjectsClientForSpaceIdMock).toHaveBeenCalledWith(core, undefined);

    const [, clientPassedToUpdate, , , spaceIdPassedToUpdate] =
      updateGlobalPacksCreateCallbackMock.mock.calls[0];
    expect(clientPassedToUpdate).toBe(spaceScopedClient);
    expect(spaceIdPassedToUpdate).toBe(undefined);
  });

  it('forwards the rrule feature flag to the update callback', async () => {
    const soClient = buildSoClient('custom-space');
    const callback = getPackagePolicyCreateCallback(core, osqueryContext, initialize, true);

    await callback(buildNewPackagePolicy(OSQUERY_INTEGRATION_NAME), soClient);

    const [, , , , , isRruleFeatureEnabledPassedToUpdate] =
      updateGlobalPacksCreateCallbackMock.mock.calls[0];
    expect(isRruleFeatureEnabledPassedToUpdate).toBe(true);
  });

  it('is a no-op for non-osquery package policies', async () => {
    const soClient = buildSoClient('custom-space');
    const callback = getPackagePolicyCreateCallback(core, osqueryContext, initialize, false);

    const input = buildNewPackagePolicy('system');
    const result = await callback(input, soClient);

    expect(result).toBe(input);
    expect(initialize).not.toHaveBeenCalled();
    expect(getInternalSavedObjectsClientForSpaceIdMock).not.toHaveBeenCalled();
    expect(updateGlobalPacksCreateCallbackMock).not.toHaveBeenCalled();
  });

  it('initializes osquery assets before looking up packs', async () => {
    const soClient = buildSoClient('custom-space');
    const callback = getPackagePolicyCreateCallback(core, osqueryContext, initialize, false);

    await callback(buildNewPackagePolicy(OSQUERY_INTEGRATION_NAME), soClient);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize.mock.invocationCallOrder[0]).toBeLessThan(
      (spaceScopedClient.find as jest.Mock).mock.invocationCallOrder[0]
    );
  });
});
