/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import type { AccessPolicy } from '@kbn/ols';

import { OlsService, type OlsServiceStartParams } from './ols_service';
import { createPrivilegeCheckRecovery, getRecoveryAction } from './recovery';
import type { ScopedOlsService } from './scoped_ols_service';
import { Actions } from '..';

const actions = new Actions();
const RECOVERY_ACTION = getRecoveryAction(actions, 'action');

const createOlsService = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const typeRegistry = typeRegistryMock.create();
  typeRegistry.getAllTypes.mockReturnValue([
    { name: 'action' },
    { name: 'action_task_params' },
  ] as SavedObjectsType[]);
  typeRegistry.getAccessPolicy.mockImplementation((type) =>
    type === 'action' ? ({} as AccessPolicy) : undefined
  );
  // Recovery actions only need the enablement, the privilege actions, and the type registry.
  return new OlsService({
    enabled,
    authz: { actions },
    typeRegistry,
  } as unknown as OlsServiceStartParams);
};

describe('OlsService#getRecoveryActions', () => {
  it('returns recovery for each type with an access policy that the check asks about', () => {
    const olsService = createOlsService();

    expect(
      olsService.getRecoveryActions([
        actions.savedObject.get('action', 'get'),
        actions.savedObject.get('action_task_params', 'create'),
      ])
    ).toEqual(new Map([[RECOVERY_ACTION, 'action']]));
  });

  it('returns nothing for a check that asks about no type with an access policy', () => {
    const olsService = createOlsService();

    expect(
      olsService.getRecoveryActions([
        actions.savedObject.get('action_task_params', 'create'),
        actions.savedObject.get('actions', 'get'),
        actions.api.get('actions:read'),
      ])
    ).toEqual(new Map());
  });

  it('returns nothing while OLS is disabled', () => {
    const olsService = createOlsService({ enabled: false });

    expect(olsService.getRecoveryActions([actions.savedObject.get('action', 'get')])).toEqual(
      new Map()
    );
  });
});

describe('createPrivilegeCheckRecovery', () => {
  it('leaves privilege checks unchanged before the OLS service starts', () => {
    const recovery = createPrivilegeCheckRecovery(() => undefined);

    expect(recovery.getRecoveryActions([actions.savedObject.get('action', 'get')])).toEqual(
      new Map()
    );
    expect(() =>
      recovery.primeRecovery(httpServerMock.createKibanaRequest(), 'action', ['default'], true)
    ).not.toThrow();
  });

  it('primes recovery on the OLS service scoped to the request', () => {
    const olsService = createOlsService();
    const primeRecovery = jest.fn();
    const asScoped = jest
      .spyOn(olsService, 'asScoped')
      .mockReturnValue({ primeRecovery } as unknown as ScopedOlsService);
    const request = httpServerMock.createKibanaRequest();

    createPrivilegeCheckRecovery(() => olsService).primeRecovery(
      request,
      'action',
      ['default'],
      true
    );

    expect(asScoped).toHaveBeenCalledWith(request);
    expect(primeRecovery).toHaveBeenCalledWith('action', ['default'], true);
  });
});
