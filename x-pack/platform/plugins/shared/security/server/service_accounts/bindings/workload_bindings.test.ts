/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-server';
import type { MockedLogger } from '@kbn/logging-mocks';

import type { WorkloadBindingStore } from './workload_binding_store';
import {
  createNotImplementedWorkloadBindings,
  ServiceAccountWorkloadBindings,
} from './workload_bindings';
import { licenseMock } from '../../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import type { ServiceAccountMintInterceptor } from '../fake_requests';
import type { ServiceAccountsBackend } from '../types';

const PLUGIN_ID = 'alerting';
// What a mutation names: the space is taken from the request, not the caller.
const WORKLOAD = { workloadType: 'rule', workloadId: 'rule-id' };
// What a read or an execution names: there is no request, so the space is explicit.
const WORKLOAD_IN_SPACE = { ...WORKLOAD, spaceId: 'default' };
const COORDINATES = { pluginId: PLUGIN_ID, ...WORKLOAD_IN_SPACE };

const binding = (
  overrides: Partial<ServiceAccountWorkloadBinding> = {}
): ServiceAccountWorkloadBinding => ({
  ...COORDINATES,
  serviceAccountId: 'service-account-id',
  boundBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
  boundAt: '2026-08-21T00:00:00.000Z',
  ...overrides,
});

describe('ServiceAccountWorkloadBindings', () => {
  let store: jest.Mocked<WorkloadBindingStore>;
  let backend: jest.Mocked<ServiceAccountsBackend>;
  let license: ReturnType<typeof licenseMock.create>;
  let checkPrivileges: jest.Mock;
  let getCurrentUser: jest.Mock;
  let getCurrentUserProfileId: jest.Mock;
  let getSpaceId: jest.Mock;
  let logger: MockedLogger;
  let mintedRequest: KibanaRequest;
  let bindings: ServiceAccountWorkloadBindings;

  const build = (overrides: Partial<Record<string, unknown>> = {}) =>
    new ServiceAccountWorkloadBindings({
      logger,
      license,
      store,
      backend,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally: checkPrivileges }),
      getCurrentUser,
      getCurrentUserProfileId,
      getSpaceId,
      canEncrypt: true,
      ...overrides,
    } as never);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
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
    getCurrentUserProfileId = jest.fn().mockResolvedValue('profile-uid');
    getSpaceId = jest.fn().mockReturnValue('default');

    bindings = build();
  });

  describe('#bindWorkload', () => {
    it('stores the binding in the space of the request, not one the caller names', async () => {
      const request = httpServerMock.createKibanaRequest();
      getSpaceId.mockReturnValue('marketing');

      await bindings.bindWorkload(PLUGIN_ID, request, {
        serviceAccountId: 'service-account-id',
        ...WORKLOAD,
        // A consumer forwarding an attacker-controlled space must not be able to reach it: the
        // privilege gate is a cluster privilege and grants no access to any particular space.
        spaceId: 'another-space',
      } as never);

      expect(getSpaceId).toHaveBeenCalledWith(request);
      expect(store.set).toHaveBeenCalledWith(
        expect.objectContaining({ ...COORDINATES, spaceId: 'marketing' })
      );
    });

    it('records the binding for the acting user', async () => {
      const request = httpServerMock.createKibanaRequest();

      const result = await bindings.bindWorkload(PLUGIN_ID, request, {
        serviceAccountId: 'service-account-id',
        ...WORKLOAD,
      });

      expect(store.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ...COORDINATES,
          serviceAccountId: 'service-account-id',
          boundBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
        })
      );
      expect(result.serviceAccountId).toBe('service-account-id');
    });

    it('generates an independent canary per bind, so no two generations share one', async () => {
      const request = httpServerMock.createKibanaRequest();
      const params = { serviceAccountId: 'service-account-id', ...WORKLOAD };

      await bindings.bindWorkload(PLUGIN_ID, request, params);
      await bindings.bindWorkload(PLUGIN_ID, request, params);

      const [[first], [second]] = store.set.mock.calls;
      expect(first.canary).not.toBe(second.canary);
    });

    it('requires the `manage_security` cluster privilege', async () => {
      checkPrivileges.mockResolvedValue({ hasAllRequested: false });

      await expect(
        bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        })
      ).rejects.toMatchObject({
        message:
          'Cannot bind a service account to a workload: missing `manage_security` cluster privilege',
        output: { statusCode: 403 },
      });

      expect(checkPrivileges).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
      expect(store.set).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Refused to bind a service account to a workload: missing `manage_security` cluster privilege'
      );
    });

    it('refuses an unauthenticated request', async () => {
      getCurrentUser.mockReturnValue(null);

      await expect(
        bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        })
      ).rejects.toMatchObject({ output: { statusCode: 401 } });
      expect(store.set).not.toHaveBeenCalled();
    });
  });

  describe('#unbindWorkload', () => {
    it('removes the binding behind the same privilege gate as bindWorkload', async () => {
      await expect(
        bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).resolves.toBe(true);

      expect(checkPrivileges).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
      expect(store.delete).toHaveBeenCalledWith(COORDINATES);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('removes the binding in the space of the request, not one the caller names', async () => {
      const request = httpServerMock.createKibanaRequest();
      getSpaceId.mockReturnValue('marketing');

      await bindings.unbindWorkload(PLUGIN_ID, request, {
        ...WORKLOAD,
        spaceId: 'another-space',
      } as never);

      expect(getSpaceId).toHaveBeenCalledWith(request);
      expect(store.delete).toHaveBeenCalledWith({ ...COORDINATES, spaceId: 'marketing' });
    });

    it('requires the `manage_security` cluster privilege', async () => {
      checkPrivileges.mockResolvedValue({ hasAllRequested: false });

      await expect(
        bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(store.delete).not.toHaveBeenCalled();
    });

    it('reports, rather than fails, when there was no binding to remove', async () => {
      store.delete.mockResolvedValue(false);
      getSpaceId.mockReturnValue('marketing');

      await expect(
        bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).resolves.toBe(false);
      // Names the space: the likeliest cause is a workload deleted from a different one.
      expect(logger.warn).toHaveBeenCalledWith(
        'Unbinding matched no binding for workload [rule/rule-id] of plugin [alerting] in space [marketing]'
      );
    });
  });

  describe('#getBinding', () => {
    it('scopes the lookup to the plugin Core supplied', async () => {
      await expect(bindings.getBinding(PLUGIN_ID, WORKLOAD_IN_SPACE)).resolves.toEqual(binding());
      expect(store.getVerified).toHaveBeenCalledWith(COORDINATES);
    });

    it('keys the lookup by the space it was given', async () => {
      await bindings.getBinding(PLUGIN_ID, { ...WORKLOAD_IN_SPACE, spaceId: 'marketing' });
      expect(store.getVerified).toHaveBeenCalledWith({ ...COORDINATES, spaceId: 'marketing' });
    });

    it('reports an unbound workload as null rather than an error', async () => {
      store.getVerified.mockResolvedValue(null);
      await expect(bindings.getBinding(PLUGIN_ID, WORKLOAD_IN_SPACE)).resolves.toBeNull();
    });
  });

  describe('#withScopedRequest', () => {
    it('runs the callback with a request bound to the workload’s service account', async () => {
      const result = await bindings.withScopedRequest(
        PLUGIN_ID,
        WORKLOAD_IN_SPACE,
        async (request) => {
          expect(request).toBe(mintedRequest);
          return 'executed';
        }
      );

      expect(result).toBe('executed');
      expect(backend.createFakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ serviceAccountId: 'service-account-id', spaceId: 'default' })
      );
    });

    it('opts out of the time-based lease in favour of per-mint binding checks', async () => {
      await bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined);

      const [[params]] = backend.createFakeRequest.mock.calls;
      expect(params.maxLifetimeMs).toBe(Number.POSITIVE_INFINITY);
      expect(params.mintInterceptor).toEqual(expect.any(Function));
    });

    it('releases the request when the callback resolves, ending credential replacement', async () => {
      await bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined);
      expect(backend.releaseFakeRequest).toHaveBeenCalledWith(mintedRequest);
    });

    it('releases the request when the callback throws', async () => {
      await expect(
        bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => {
          throw new Error('execution failed');
        })
      ).rejects.toThrowError('execution failed');

      expect(backend.releaseFakeRequest).toHaveBeenCalledWith(mintedRequest);
    });

    it('refuses to start when the workload has no binding', async () => {
      store.getVerified.mockResolvedValue(null);

      await expect(
        bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined)
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
      expect(backend.createFakeRequest).not.toHaveBeenCalled();
    });

    it('propagates a failed integrity check instead of executing', async () => {
      store.getVerified.mockRejectedValue(new Error('failed integrity verification'));

      await expect(
        bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined)
      ).rejects.toThrowError('failed integrity verification');
      expect(backend.createFakeRequest).not.toHaveBeenCalled();
    });

    describe('the mint interceptor', () => {
      const captureInterceptor = async (): Promise<ServiceAccountMintInterceptor> => {
        await bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined);
        const [[params]] = backend.createFakeRequest.mock.calls;
        return params.mintInterceptor!;
      };

      // The registry invokes the interceptor once for the initial mint, before any refresh.
      const captureRefreshInterceptor = async (): Promise<ServiceAccountMintInterceptor> => {
        const interceptor = await captureInterceptor();
        await interceptor(jest.fn().mockResolvedValue('essu_initial'));
        store.getVerified.mockClear();
        return interceptor;
      };

      it('lets the initial mint through on the strength of the verification just made', async () => {
        const interceptor = await captureInterceptor();
        expect(store.getVerified).toHaveBeenCalledTimes(1);
        const mint = jest.fn().mockResolvedValue('essu_initial');

        await expect(interceptor(mint)).resolves.toBe('essu_initial');
        expect(store.getVerified).toHaveBeenCalledTimes(1);
        expect(mint).toHaveBeenCalledTimes(1);
      });

      it('re-reads the binding before allowing a re-mint', async () => {
        const interceptor = await captureRefreshInterceptor();
        const mint = jest.fn().mockResolvedValue('essu_fresh');

        await expect(interceptor(mint)).resolves.toBe('essu_fresh');
        expect(store.getVerified).toHaveBeenCalledWith(COORDINATES);
        expect(mint).toHaveBeenCalledTimes(1);
      });

      it('refuses to re-mint once the workload has been unbound, and says so', async () => {
        const interceptor = await captureRefreshInterceptor();
        store.getVerified.mockResolvedValue(null);
        const mint = jest.fn();

        await expect(interceptor(mint)).rejects.toMatchObject({ output: { statusCode: 404 } });
        expect(mint).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringMatching(
            /^Refusing to re-mint a credential for workload \[rule\/rule-id\] of plugin \[alerting\]: .*No service account is bound/
          )
        );
      });

      it('refuses to re-mint when the binding no longer verifies', async () => {
        const interceptor = await captureRefreshInterceptor();
        store.getVerified.mockRejectedValue(new Error('failed integrity verification'));
        const mint = jest.fn();

        await expect(interceptor(mint)).rejects.toThrowError('failed integrity verification');
        expect(mint).not.toHaveBeenCalled();
      });

      it('refuses to re-mint when the workload was re-bound to a different service account', async () => {
        const interceptor = await captureRefreshInterceptor();
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
        'bindWorkload',
        (api: ServiceAccountWorkloadBindings) =>
          api.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
            serviceAccountId: 'sa',
            ...WORKLOAD,
          }),
      ],
      [
        'unbindWorkload',
        (api: ServiceAccountWorkloadBindings) =>
          api.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD),
      ],
      [
        'getBinding',
        (api: ServiceAccountWorkloadBindings) => api.getBinding(PLUGIN_ID, WORKLOAD_IN_SPACE),
      ],
      [
        'withScopedRequest',
        (api: ServiceAccountWorkloadBindings) =>
          api.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined),
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

      await expect(bindings.getBinding(PLUGIN_ID, WORKLOAD_IN_SPACE)).rejects.toMatchObject({
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
      'bindWorkload',
      () =>
        api.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'sa',
          ...WORKLOAD,
        }),
    ],
    [
      'unbindWorkload',
      () => api.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD),
    ],
    ['getBinding', () => api.getBinding(PLUGIN_ID, WORKLOAD_IN_SPACE)],
    [
      'withScopedRequest',
      () => api.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined),
    ],
  ])('rejects %s with a 501', async (_name, invoke) => {
    await expect(invoke()).rejects.toMatchObject(expected);
  });
});
