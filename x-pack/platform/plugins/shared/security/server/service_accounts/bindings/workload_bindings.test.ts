/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-server';

import type { WorkloadBindingStore } from './workload_binding_store';
import {
  createNotImplementedWorkloadBindings,
  ServiceAccountWorkloadBindings,
} from './workload_bindings';
import { licenseMock } from '../../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import type { ServiceAccountMintInterceptor } from '../fake_requests';
import type { ServiceAccountsBackend } from '../types';

const OPERATION_TYPE = 'alerting';
const WORKLOAD = { workloadType: 'rule', workloadId: 'rule-id' };
const COORDINATES = { operationType: OPERATION_TYPE, ...WORKLOAD, spaceId: 'default' };

const binding = (
  overrides: Partial<ServiceAccountWorkloadBinding> = {}
): ServiceAccountWorkloadBinding => ({
  ...COORDINATES,
  serviceAccountId: 'service-account-id',
  attachedBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
  attachedAt: '2026-08-21T00:00:00.000Z',
  ...overrides,
});

describe('ServiceAccountWorkloadBindings', () => {
  let store: jest.Mocked<WorkloadBindingStore>;
  let backend: jest.Mocked<ServiceAccountsBackend>;
  let license: ReturnType<typeof licenseMock.create>;
  let checkPrivileges: jest.Mock;
  let getCurrentUser: jest.Mock;
  let getCurrentProfileId: jest.Mock;
  let mintedRequest: KibanaRequest;
  let bindings: ServiceAccountWorkloadBindings;

  const build = (overrides: Partial<Record<string, unknown>> = {}) =>
    new ServiceAccountWorkloadBindings({
      logger: loggingSystemMock.create().get('workload-bindings'),
      license,
      store,
      backend,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally: checkPrivileges }),
      getCurrentUser,
      getCurrentProfileId,
      getSpaceId: jest.fn().mockReturnValue('default'),
      canEncrypt: true,
      ...overrides,
    } as never);

  beforeEach(() => {
    store = {
      set: jest.fn().mockImplementation(async (attributes) => binding(attributes)),
      delete: jest.fn().mockResolvedValue(true),
      getVerified: jest.fn().mockResolvedValue(binding()),
      findByServiceAccountId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<WorkloadBindingStore>;

    mintedRequest = httpServerMock.createFakeKibanaRequest({
      headers: { authorization: 'Bearer essu_token' },
    });

    backend = {
      create: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
      exchangeToken: jest.fn(),
      createFakeRequest: jest.fn().mockResolvedValue(mintedRequest),
      reauthenticateFakeRequest: jest.fn(),
      releaseFakeRequest: jest.fn(),
    };

    license = licenseMock.create();
    license.isEnabled.mockReturnValue(true);
    checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    getCurrentUser = jest
      .fn()
      .mockReturnValue(mockAuthenticatedUser({ username: 'elastic', profile_uid: 'profile-uid' }));
    getCurrentProfileId = jest.fn().mockResolvedValue('profile-uid');

    bindings = build();
  });

  describe('#attach', () => {
    it('records the binding for the acting user in their space', async () => {
      const request = httpServerMock.createKibanaRequest();

      const result = await bindings.attach(OPERATION_TYPE, request, {
        serviceAccountId: 'service-account-id',
        ...WORKLOAD,
      });

      expect(store.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ...COORDINATES,
          serviceAccountId: 'service-account-id',
          attachedBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
        })
      );
      expect(result.serviceAccountId).toBe('service-account-id');
    });

    it('generates a fresh canary per attach, so an older binding cannot be restored in place', async () => {
      const request = httpServerMock.createKibanaRequest();
      const params = { serviceAccountId: 'service-account-id', ...WORKLOAD };

      await bindings.attach(OPERATION_TYPE, request, params);
      await bindings.attach(OPERATION_TYPE, request, params);

      const [[first], [second]] = store.set.mock.calls;
      expect(first.canary).not.toBe(second.canary);
    });

    it('requires the `manage_security` cluster privilege', async () => {
      checkPrivileges.mockResolvedValue({ hasAllRequested: false });

      await expect(
        bindings.attach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        })
      ).rejects.toMatchObject({
        message:
          'Cannot attach a service account to a workload: missing `manage_security` cluster privilege',
        output: { statusCode: 403 },
      });

      expect(checkPrivileges).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
      expect(store.set).not.toHaveBeenCalled();
    });

    it('refuses an unauthenticated request', async () => {
      getCurrentUser.mockReturnValue(null);

      await expect(
        bindings.attach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        })
      ).rejects.toMatchObject({ output: { statusCode: 401 } });
      expect(store.set).not.toHaveBeenCalled();
    });
  });

  describe('#detach', () => {
    it('removes the binding behind the same privilege gate as attach', async () => {
      await bindings.detach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), WORKLOAD);

      expect(checkPrivileges).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
      expect(store.delete).toHaveBeenCalledWith(COORDINATES);
    });

    it('requires the `manage_security` cluster privilege', async () => {
      checkPrivileges.mockResolvedValue({ hasAllRequested: false });

      await expect(
        bindings.detach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(store.delete).not.toHaveBeenCalled();
    });

    it('succeeds when there was no binding to remove', async () => {
      store.delete.mockResolvedValue(false);
      await expect(
        bindings.detach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).resolves.toBeUndefined();
    });
  });

  describe('#getBinding', () => {
    it('scopes the lookup to the handle’s operation type and the default space', async () => {
      await expect(bindings.getBinding(OPERATION_TYPE, WORKLOAD)).resolves.toEqual(binding());
      expect(store.getVerified).toHaveBeenCalledWith(COORDINATES);
    });

    it('honors an explicit space', async () => {
      await bindings.getBinding(OPERATION_TYPE, { ...WORKLOAD, spaceId: 'marketing' });
      expect(store.getVerified).toHaveBeenCalledWith({ ...COORDINATES, spaceId: 'marketing' });
    });

    it('reports an unbound workload as null rather than an error', async () => {
      store.getVerified.mockResolvedValue(null);
      await expect(bindings.getBinding(OPERATION_TYPE, WORKLOAD)).resolves.toBeNull();
    });
  });

  describe('#withScopedRequest', () => {
    it('runs the callback with a request bound to the workload’s service account', async () => {
      const result = await bindings.withScopedRequest(OPERATION_TYPE, WORKLOAD, async (request) => {
        expect(request).toBe(mintedRequest);
        return 'executed';
      });

      expect(result).toBe('executed');
      expect(backend.createFakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ serviceAccountId: 'service-account-id', spaceId: 'default' })
      );
    });

    it('opts out of the time-based lease in favour of per-mint binding checks', async () => {
      await bindings.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => undefined);

      const [[params]] = backend.createFakeRequest.mock.calls;
      expect(params.maxLifetimeMs).toBe(Number.POSITIVE_INFINITY);
      expect(params.mintInterceptor).toEqual(expect.any(Function));
    });

    it('releases the request when the callback resolves, ending credential replacement', async () => {
      await bindings.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => undefined);
      expect(backend.releaseFakeRequest).toHaveBeenCalledWith(mintedRequest);
    });

    it('releases the request when the callback throws', async () => {
      await expect(
        bindings.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => {
          throw new Error('execution failed');
        })
      ).rejects.toThrowError('execution failed');

      expect(backend.releaseFakeRequest).toHaveBeenCalledWith(mintedRequest);
    });

    it('refuses to start when the workload has no binding', async () => {
      store.getVerified.mockResolvedValue(null);

      await expect(
        bindings.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => undefined)
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
      expect(backend.createFakeRequest).not.toHaveBeenCalled();
    });

    it('propagates a failed integrity check instead of executing', async () => {
      store.getVerified.mockRejectedValue(new Error('failed integrity verification'));

      await expect(
        bindings.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => undefined)
      ).rejects.toThrowError('failed integrity verification');
      expect(backend.createFakeRequest).not.toHaveBeenCalled();
    });

    describe('the mint interceptor', () => {
      const captureInterceptor = async (): Promise<ServiceAccountMintInterceptor> => {
        await bindings.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => undefined);
        const [[params]] = backend.createFakeRequest.mock.calls;
        return params.mintInterceptor!;
      };

      it('re-reads the binding before allowing a mint', async () => {
        const interceptor = await captureInterceptor();
        store.getVerified.mockClear();
        const mint = jest.fn().mockResolvedValue('essu_fresh');

        await expect(interceptor(mint)).resolves.toBe('essu_fresh');
        expect(store.getVerified).toHaveBeenCalledWith(COORDINATES);
        expect(mint).toHaveBeenCalledTimes(1);
      });

      it('refuses to mint once the binding has been detached', async () => {
        const interceptor = await captureInterceptor();
        store.getVerified.mockResolvedValue(null);
        const mint = jest.fn();

        await expect(interceptor(mint)).rejects.toMatchObject({ output: { statusCode: 404 } });
        expect(mint).not.toHaveBeenCalled();
      });

      it('refuses to mint when the binding no longer verifies', async () => {
        const interceptor = await captureInterceptor();
        store.getVerified.mockRejectedValue(new Error('failed integrity verification'));
        const mint = jest.fn();

        await expect(interceptor(mint)).rejects.toThrowError('failed integrity verification');
        expect(mint).not.toHaveBeenCalled();
      });

      it('refuses to mint when the workload was re-bound to a different service account', async () => {
        const interceptor = await captureInterceptor();
        store.getVerified.mockResolvedValue(binding({ serviceAccountId: 'a-different-account' }));
        const mint = jest.fn();

        await expect(interceptor(mint)).rejects.toMatchObject({
          message:
            'The workload was bound to a different service account; refusing to mint a credential for the previous one.',
          output: { statusCode: 403 },
        });
        expect(mint).not.toHaveBeenCalled();
      });
    });
  });

  describe('availability', () => {
    it.each([
      [
        'attach',
        (api: ServiceAccountWorkloadBindings) =>
          api.attach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), {
            serviceAccountId: 'sa',
            ...WORKLOAD,
          }),
      ],
      [
        'detach',
        (api: ServiceAccountWorkloadBindings) =>
          api.detach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), WORKLOAD),
      ],
      [
        'getBinding',
        (api: ServiceAccountWorkloadBindings) => api.getBinding(OPERATION_TYPE, WORKLOAD),
      ],
      [
        'withScopedRequest',
        (api: ServiceAccountWorkloadBindings) =>
          api.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => undefined),
      ],
    ])('fails %s closed when saved object encryption is unavailable', async (_name, invoke) => {
      const withoutEncryption = build({ canEncrypt: false });

      await expect(invoke(withoutEncryption)).rejects.toMatchObject({
        message:
          'Cannot use service account workload bindings: saved object encryption is not available. Set `xpack.encryptedSavedObjects.encryptionKey`.',
        output: { statusCode: 403 },
      });
      expect(store.set).not.toHaveBeenCalled();
      expect(store.delete).not.toHaveBeenCalled();
      expect(store.getVerified).not.toHaveBeenCalled();
    });

    it('fails closed when security features are disabled in Elasticsearch', async () => {
      license.isEnabled.mockReturnValue(false);

      await expect(bindings.getBinding(OPERATION_TYPE, WORKLOAD)).rejects.toMatchObject({
        message:
          'Cannot use service account workload bindings: security features are disabled in Elasticsearch',
        output: { statusCode: 403 },
      });
    });
  });
});

describe('createNotImplementedWorkloadBindings', () => {
  const api = createNotImplementedWorkloadBindings();
  const expected = {
    message:
      'Service account workload bindings are not yet implemented for the Elasticsearch backend',
    output: { statusCode: 501 },
  };

  it.each([
    [
      'attach',
      () =>
        api.attach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'sa',
          ...WORKLOAD,
        }),
    ],
    ['detach', () => api.detach(OPERATION_TYPE, httpServerMock.createKibanaRequest(), WORKLOAD)],
    ['getBinding', () => api.getBinding(OPERATION_TYPE, WORKLOAD)],
    [
      'withScopedRequest',
      () => api.withScopedRequest(OPERATION_TYPE, WORKLOAD, async () => undefined),
    ],
  ])('rejects %s with a 501', async (_name, invoke) => {
    await expect(invoke()).rejects.toMatchObject(expected);
  });
});
