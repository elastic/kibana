/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-server';
import type { MockedLogger } from '@kbn/logging-mocks';

import type { WorkloadBindingStore } from './workload_binding_store';
import { ServiceAccountWorkloadBindings } from './workload_bindings';
import { licenseMock } from '../../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { auditLoggerMock, auditServiceMock } from '../../audit/mocks';
import type { ServiceAccountMintInterceptor } from '../fake_requests';
import { ServiceAccountTokenExchangeError } from '../token_exchange_error';
import type { ServiceAccountsBackend } from '../types';

const PLUGIN_ID = 'alerting';
// What a mutation names: the space is taken from the request, not the caller.
const WORKLOAD = { workloadType: 'rule', workloadId: 'rule-id' };
// What a read or an execution names: there is no request, so the space is explicit.
const WORKLOAD_IN_SPACE = { ...WORKLOAD, spaceId: 'default' };
const COORDINATES = { pluginId: PLUGIN_ID, ...WORKLOAD_IN_SPACE };
// The same workload as an audit event names it.
const AUDIT_WORKLOAD = { plugin_id: PLUGIN_ID, type: 'rule', id: 'rule-id' };

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
  let audit: ReturnType<typeof auditServiceMock.create>;
  let auditLogger: ReturnType<typeof auditLoggerMock.create>;
  let mintedRequest: KibanaRequest;
  let bindings: ServiceAccountWorkloadBindings;

  const build = (overrides: Partial<Record<string, unknown>> = {}) =>
    new ServiceAccountWorkloadBindings({
      logger,
      license,
      store,
      backend,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally: checkPrivileges }),
      audit,
      getCurrentUser,
      getCurrentUserProfileId,
      getSpaceId,
      canEncrypt: true,
      ...overrides,
    } as never);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    store = {
      bulkSet: jest
        .fn()
        .mockImplementation(async (written: ServiceAccountWorkloadBinding[]) =>
          written.map((attributes) => ({ ok: true, value: binding(attributes) }))
        ),
      bulkDelete: jest
        .fn()
        .mockImplementation(async (removed: unknown[]) =>
          removed.map(() => ({ ok: true, value: true }))
        ),
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
      getSummary: jest.fn(),
      createFakeRequest: jest.fn().mockResolvedValue(mintedRequest),
      reauthenticateFakeRequest: jest.fn(),
      refreshFakeRequestBeforeUse: jest.fn(),
      releaseFakeRequest: jest.fn(),
      getFakeRequestPrincipal: jest.fn(),
      delete: jest.fn(),
    };

    license = licenseMock.create();
    license.isEnabled.mockReturnValue(true);
    checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    getCurrentUser = jest
      .fn()
      .mockReturnValue(mockAuthenticatedUser({ username: 'elastic', profile_uid: 'profile-uid' }));
    getCurrentUserProfileId = jest.fn().mockResolvedValue('profile-uid');
    getSpaceId = jest.fn().mockReturnValue('default');
    auditLogger = auditLoggerMock.create();
    audit = auditServiceMock.create();
    audit.asScoped.mockReturnValue(auditLogger);

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
      expect(store.bulkSet).toHaveBeenCalledWith([
        expect.objectContaining({ ...COORDINATES, spaceId: 'marketing' }),
      ]);
    });

    it('records the binding for the acting user', async () => {
      const request = httpServerMock.createKibanaRequest();

      const result = await bindings.bindWorkload(PLUGIN_ID, request, {
        serviceAccountId: 'service-account-id',
        ...WORKLOAD,
      });

      expect(store.bulkSet).toHaveBeenCalledWith([
        expect.objectContaining({
          ...COORDINATES,
          serviceAccountId: 'service-account-id',
          boundBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
        }),
      ]);
      expect(result.serviceAccountId).toBe('service-account-id');
    });

    it('generates an independent canary per bind, so no two generations share one', async () => {
      const request = httpServerMock.createKibanaRequest();
      const params = { serviceAccountId: 'service-account-id', ...WORKLOAD };

      await bindings.bindWorkload(PLUGIN_ID, request, params);
      await bindings.bindWorkload(PLUGIN_ID, request, params);

      const [[[first]], [[second]]] = store.bulkSet.mock.calls;
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
      expect(store.bulkSet).not.toHaveBeenCalled();
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
      expect(store.bulkSet).not.toHaveBeenCalled();
    });

    it.each([
      [
        'the write fails as a whole',
        (error: Error) => store.bulkSet.mockRejectedValue(error),
        new Error('cluster unavailable'),
      ],
      [
        'the binding could not be written',
        (error: Error) => store.bulkSet.mockResolvedValue([{ ok: false, error } as never]),
        Boom.conflict('The binding was changed concurrently.'),
      ],
    ])('throws the error it failed with when %s', async (_name, fail, error) => {
      fail(error);

      await expect(
        bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        })
      ).rejects.toBe(error);
      expect(logger.debug).not.toHaveBeenCalledWith(expect.stringMatching(/^Bound /));
    });

    describe('audit', () => {
      const bindEvent = (outcome: 'unknown' | 'failure') =>
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'service_account_workload_bind',
            category: ['iam'],
            type: ['user', 'change'],
            outcome,
          }),
          user: { target: { id: 'service-account-id' } },
          kibana: { workload: AUDIT_WORKLOAD },
        });

      it('logs the intent, scoped to the request, before the binding is written', async () => {
        const request = httpServerMock.createKibanaRequest();
        store.bulkSet.mockImplementation(async (written) => {
          expect(auditLogger.log).toHaveBeenCalledWith(bindEvent('unknown'));
          return written.map((attributes) => ({ ok: true, value: binding(attributes) }));
        });

        await bindings.bindWorkload(PLUGIN_ID, request, {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        });

        expect(audit.asScoped).toHaveBeenCalledWith(request);
        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              'User is binding service account [id=service-account-id] to workload [alerting/rule/rule-id]',
          })
        );
      });

      it('logs a failure when the caller is not authorized', async () => {
        checkPrivileges.mockResolvedValue({ hasAllRequested: false });

        await expect(
          bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
            serviceAccountId: 'service-account-id',
            ...WORKLOAD,
          })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(bindEvent('failure'));
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              code: 'Error',
              message:
                'Cannot bind a service account to a workload: missing `manage_security` cluster privilege',
            },
          })
        );
        expect(store.bulkSet).not.toHaveBeenCalled();
      });

      it('logs an unbind of the previous account first when the workload is rebound', async () => {
        store.getVerified.mockResolvedValue(binding({ serviceAccountId: 'previous-account-id' }));

        await bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        });

        expect(store.getVerified).toHaveBeenCalledWith(COORDINATES);
        expect(auditLogger.log).toHaveBeenCalledTimes(2);
        expect(auditLogger.log).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'service_account_workload_unbind',
              outcome: 'unknown',
            }),
            user: { target: { id: 'previous-account-id' } },
            kibana: { workload: AUDIT_WORKLOAD },
          })
        );
        expect(auditLogger.log).toHaveBeenNthCalledWith(2, bindEvent('unknown'));
      });

      it('logs one bind event when the workload is rebound to the same account', async () => {
        store.getVerified.mockResolvedValue(binding({ serviceAccountId: 'service-account-id' }));

        await bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(bindEvent('unknown'));
      });

      it('logs one bind event when the workload was not bound', async () => {
        store.getVerified.mockResolvedValue(null);

        await bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(bindEvent('unknown'));
      });

      it('rebinds without naming a previous account that failed integrity verification', async () => {
        store.getVerified.mockRejectedValue(
          Boom.forbidden(
            'The service account binding for this workload failed integrity verification.'
          )
        );

        await bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
          serviceAccountId: 'service-account-id',
          ...WORKLOAD,
        });

        expect(store.bulkSet).toHaveBeenCalled();
        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(bindEvent('unknown'));
      });

      it('propagates a failure to read the previous binding without writing', async () => {
        store.getVerified.mockRejectedValue(new Error('store unavailable'));

        await expect(
          bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
            serviceAccountId: 'service-account-id',
            ...WORKLOAD,
          })
        ).rejects.toThrow('store unavailable');

        expect(store.bulkSet).not.toHaveBeenCalled();
        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing for an unauthenticated request', async () => {
        getCurrentUser.mockReturnValue(null);

        await expect(
          bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
            serviceAccountId: 'service-account-id',
            ...WORKLOAD,
          })
        ).rejects.toMatchObject({ output: { statusCode: 401 } });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when the privilege check itself fails', async () => {
        checkPrivileges.mockRejectedValue(new Error('cluster unavailable'));

        await expect(
          bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
            serviceAccountId: 'service-account-id',
            ...WORKLOAD,
          })
        ).rejects.toThrow('cluster unavailable');

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when security features are disabled', async () => {
        license.isEnabled.mockReturnValue(false);

        await expect(
          bindings.bindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), {
            serviceAccountId: 'service-account-id',
            ...WORKLOAD,
          })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });
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
      expect(store.bulkDelete).toHaveBeenCalledWith([COORDINATES]);
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
      expect(store.bulkDelete).toHaveBeenCalledWith([{ ...COORDINATES, spaceId: 'marketing' }]);
    });

    it('requires the `manage_security` cluster privilege', async () => {
      checkPrivileges.mockResolvedValue({ hasAllRequested: false });

      await expect(
        bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(store.bulkDelete).not.toHaveBeenCalled();
    });

    it.each([
      [
        'the delete fails as a whole',
        (error: Error) => store.bulkDelete.mockRejectedValue(error),
        new Error('cluster unavailable'),
      ],
      [
        'the binding could not be removed',
        (error: Error) => store.bulkDelete.mockResolvedValue([{ ok: false, error } as never]),
        Boom.serverUnavailable('unavailable'),
      ],
    ])('throws the error it failed with when %s', async (_name, fail, error) => {
      fail(error);

      await expect(
        bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).rejects.toBe(error);
      expect(logger.debug).not.toHaveBeenCalledWith(expect.stringMatching(/^Unbound /));
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('reports, rather than fails, when there was no binding to remove', async () => {
      store.bulkDelete.mockResolvedValue([{ ok: true, value: false }]);
      getSpaceId.mockReturnValue('marketing');

      await expect(
        bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
      ).resolves.toBe(false);
      // Names the space: the likeliest cause is a workload deleted from a different one.
      expect(logger.warn).toHaveBeenCalledWith(
        'Unbinding matched no binding for workload [rule/rule-id] of plugin [alerting] in space [marketing]'
      );
    });

    describe('audit', () => {
      const unbindEvent = (outcome: 'unknown' | 'failure') =>
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'service_account_workload_unbind',
            category: ['iam'],
            type: ['user', 'change'],
            outcome,
          }),
          kibana: { workload: AUDIT_WORKLOAD },
        });

      it('logs the intent, naming the verified bound account, before the binding is removed', async () => {
        const request = httpServerMock.createKibanaRequest();
        store.bulkDelete.mockImplementation(async () => {
          expect(auditLogger.log).toHaveBeenCalledWith(unbindEvent('unknown'));
          return [{ ok: true, value: true }];
        });

        await bindings.unbindWorkload(PLUGIN_ID, request, WORKLOAD);

        expect(audit.asScoped).toHaveBeenCalledWith(request);
        expect(store.getVerified).toHaveBeenCalledWith(COORDINATES);
        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { target: { id: 'service-account-id' } },
            message:
              'User is unbinding service account [id=service-account-id] from workload [alerting/rule/rule-id]',
          })
        );
      });

      it('logs the intent without a target when there was no binding to remove', async () => {
        store.getVerified.mockResolvedValue(null);
        store.bulkDelete.mockResolvedValue([{ ok: true, value: false }]);

        await expect(
          bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
        ).resolves.toBe(false);

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(unbindEvent('unknown'));
        expect(auditLogger.log.mock.calls[0][0]).not.toHaveProperty('user');
      });

      it('removes a binding that failed integrity verification without naming its account', async () => {
        store.getVerified.mockRejectedValue(
          Boom.forbidden(
            'The service account binding for this workload failed integrity verification.'
          )
        );

        await expect(
          bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
        ).resolves.toBe(true);

        expect(store.bulkDelete).toHaveBeenCalledWith([COORDINATES]);
        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log.mock.calls[0][0]).not.toHaveProperty('user');
      });

      it('propagates a failure to read the binding without deleting', async () => {
        store.getVerified.mockRejectedValue(new Error('store unavailable'));

        await expect(
          bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
        ).rejects.toThrow('store unavailable');

        expect(store.bulkDelete).not.toHaveBeenCalled();
        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs a failure when the caller is not authorized', async () => {
        checkPrivileges.mockResolvedValue({ hasAllRequested: false });

        await expect(
          bindings.unbindWorkload(PLUGIN_ID, httpServerMock.createKibanaRequest(), WORKLOAD)
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(unbindEvent('failure'));
        expect(auditLogger.log.mock.calls[0][0]).not.toHaveProperty('user');
        expect(store.bulkDelete).not.toHaveBeenCalled();
      });
    });
  });

  describe('#bulkUpdateWorkloadBindings', () => {
    const OTHER = { workloadType: 'rule', workloadId: 'other-rule-id' };
    const OTHER_COORDINATES = { ...COORDINATES, ...OTHER };
    const AUDIT_OTHER = { plugin_id: PLUGIN_ID, type: 'rule', id: 'other-rule-id' };

    const bindChange = (overrides: Record<string, string> = {}) => ({
      op: 'bind' as const,
      serviceAccountId: 'service-account-id',
      ...WORKLOAD,
      ...overrides,
    });
    const unbindChange = (overrides: Record<string, string> = {}) => ({
      op: 'unbind' as const,
      ...OTHER,
      ...overrides,
    });

    const update = (changes: Parameters<typeof bindings.bulkUpdateWorkloadBindings>[2]) =>
      bindings.bulkUpdateWorkloadBindings(PLUGIN_ID, httpServerMock.createKibanaRequest(), changes);

    it('applies binds and unbinds with one write each, and reports every change in order', async () => {
      store.getVerified.mockImplementation(async ({ workloadId }) =>
        workloadId === 'rule-id' ? null : binding({ ...OTHER, serviceAccountId: 'old-account-id' })
      );

      const results = await update([bindChange(), unbindChange()]);

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(store.bulkSet).toHaveBeenCalledTimes(1);
      expect(store.bulkSet).toHaveBeenCalledWith([
        expect.objectContaining({ ...COORDINATES, serviceAccountId: 'service-account-id' }),
      ]);
      expect(store.bulkDelete).toHaveBeenCalledTimes(1);
      expect(store.bulkDelete).toHaveBeenCalledWith([OTHER_COORDINATES]);

      expect(results).toEqual([
        {
          ...WORKLOAD,
          op: 'bind',
          ok: true,
          binding: expect.objectContaining({
            ...COORDINATES,
            serviceAccountId: 'service-account-id',
          }),
        },
        {
          ...OTHER,
          op: 'unbind',
          ok: true,
          removed: true,
          previousServiceAccountId: 'old-account-id',
        },
      ]);
      // An unbound workload has no previous account to report, not an undefined one.
      expect(results[0]).not.toHaveProperty('previousServiceAccountId');
    });

    it('reports the account a bind replaced', async () => {
      store.getVerified.mockResolvedValue(binding({ serviceAccountId: 'old-account-id' }));

      const [result] = await update([bindChange()]);

      expect(result).toMatchObject({ ok: true, previousServiceAccountId: 'old-account-id' });
    });

    it('records one binder and one time for every bind in the call', async () => {
      await update([bindChange(), bindChange(OTHER)]);

      const [[[first, second]]] = store.bulkSet.mock.calls;
      expect(first.boundBy).toEqual(second.boundBy);
      expect(first.boundAt).toBe(second.boundAt);
      // Each binding still gets its own canary.
      expect(first.canary).not.toBe(second.canary);
    });

    it('changes bindings in the space of the request, whatever a change names', async () => {
      getSpaceId.mockReturnValue('marketing');

      await update([
        { ...bindChange(), spaceId: 'another-space' } as never,
        { ...unbindChange(), spaceId: 'another-space' } as never,
      ]);

      expect(store.bulkSet).toHaveBeenCalledWith([
        expect.objectContaining({ ...COORDINATES, spaceId: 'marketing' }),
      ]);
      expect(store.bulkDelete).toHaveBeenCalledWith([
        { ...OTHER_COORDINATES, spaceId: 'marketing' },
      ]);
    });

    it('audits each change as the same change alone would be', async () => {
      store.getVerified.mockResolvedValue(binding({ serviceAccountId: 'old-account-id' }));

      await update([bindChange(), unbindChange()]);

      expect(auditLogger.log).toHaveBeenCalledTimes(3);
      expect(auditLogger.log).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          event: expect.objectContaining({ action: 'service_account_workload_unbind' }),
          user: { target: { id: 'old-account-id' } },
          kibana: { workload: AUDIT_WORKLOAD },
        })
      );
      expect(auditLogger.log).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          event: expect.objectContaining({ action: 'service_account_workload_bind' }),
          user: { target: { id: 'service-account-id' } },
          kibana: { workload: AUDIT_WORKLOAD },
        })
      );
      expect(auditLogger.log).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          event: expect.objectContaining({ action: 'service_account_workload_unbind' }),
          user: { target: { id: 'old-account-id' } },
          kibana: { workload: AUDIT_OTHER },
        })
      );
    });

    it('does nothing for an empty update', async () => {
      await expect(update([])).resolves.toEqual([]);

      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(store.getVerified).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    describe('when the caller may not change bindings', () => {
      beforeEach(() => {
        checkPrivileges.mockResolvedValue({ hasAllRequested: false });
      });

      it('refuses every change on its own, without throwing', async () => {
        await expect(update([bindChange(), unbindChange()])).resolves.toEqual([
          {
            ...WORKLOAD,
            op: 'bind',
            ok: false,
            error: {
              statusCode: 403,
              message:
                'Cannot bind a service account to a workload: missing `manage_security` cluster privilege',
            },
          },
          {
            ...OTHER,
            op: 'unbind',
            ok: false,
            error: {
              statusCode: 403,
              message:
                'Cannot unbind a service account from a workload: missing `manage_security` cluster privilege',
            },
          },
        ]);

        expect(store.getVerified).not.toHaveBeenCalled();
        expect(store.bulkSet).not.toHaveBeenCalled();
        expect(store.bulkDelete).not.toHaveBeenCalled();
      });

      it('audits a refusal for every change', async () => {
        await update([bindChange(), bindChange(OTHER), unbindChange({ workloadId: 'third' })]);

        expect(auditLogger.log).toHaveBeenCalledTimes(3);
        expect(auditLogger.log).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'service_account_workload_bind',
              outcome: 'failure',
            }),
            user: { target: { id: 'service-account-id' } },
            kibana: { workload: AUDIT_WORKLOAD },
          })
        );
        expect(auditLogger.log).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            event: expect.objectContaining({ outcome: 'failure' }),
            kibana: { workload: AUDIT_OTHER },
          })
        );
        expect(auditLogger.log).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'service_account_workload_unbind',
              outcome: 'failure',
            }),
            kibana: { workload: { ...AUDIT_WORKLOAD, id: 'third' } },
          })
        );
        expect(auditLogger.log.mock.calls[2][0]).not.toHaveProperty('user');
      });

      it('logs the refusal once per operation, not once per change', async () => {
        await update([bindChange(), bindChange(OTHER), unbindChange({ workloadId: 'third' })]);

        expect(logger.warn).toHaveBeenCalledTimes(2);
        expect(logger.warn).toHaveBeenCalledWith(
          'Refused to bind a service account to a workload: missing `manage_security` cluster privilege'
        );
        expect(logger.warn).toHaveBeenCalledWith(
          'Refused to unbind a service account from a workload: missing `manage_security` cluster privilege'
        );
      });
    });

    it('rejects the whole call when the privilege check itself fails', async () => {
      checkPrivileges.mockRejectedValue(new Error('cluster unavailable'));

      await expect(update([bindChange(), unbindChange()])).rejects.toThrow('cluster unavailable');
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('rejects the whole call when it binds and the request is not authenticated', async () => {
      getCurrentUser.mockReturnValue(null);

      await expect(update([unbindChange(), bindChange()])).rejects.toMatchObject({
        output: { statusCode: 401 },
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('unbinds on a request with no user behind it, as a single unbind does', async () => {
      getCurrentUser.mockReturnValue(null);

      await expect(update([unbindChange()])).resolves.toEqual([
        expect.objectContaining({ ok: true, removed: true }),
      ]);
    });

    it('fails only the change whose prior binding cannot be read', async () => {
      store.getVerified.mockImplementation(async ({ workloadId }) => {
        if (workloadId === 'rule-id') {
          throw new Error('store unavailable');
        }
        return null;
      });

      const results = await update([bindChange(), bindChange(OTHER)]);

      expect(results[0]).toEqual({
        ...WORKLOAD,
        op: 'bind',
        ok: false,
        // The detail is logged, not returned: it can carry what the caller's client must not see.
        error: { statusCode: 500, message: 'An internal server error occurred' },
      });
      expect(results[1]).toMatchObject({ ...OTHER, op: 'bind', ok: true });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to bind workload [rule/rule-id] of plugin [alerting]: store unavailable'
      );

      // The change that failed is neither written nor audited.
      expect(store.bulkSet).toHaveBeenCalledWith([expect.objectContaining(OTHER_COORDINATES)]);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ kibana: { workload: AUDIT_OTHER } })
      );
    });

    it('applies a change whose prior binding failed integrity verification, without naming it', async () => {
      store.getVerified.mockRejectedValue(
        Boom.forbidden(
          'The service account binding for this workload failed integrity verification.'
        )
      );

      const [result] = await update([bindChange()]);

      expect(result).toMatchObject({ ok: true });
      expect(result).not.toHaveProperty('previousServiceAccountId');
    });

    it('reads prior bindings at most ten at a time', async () => {
      let inFlight = 0;
      let mostInFlight = 0;
      store.getVerified.mockImplementation(async () => {
        inFlight++;
        mostInFlight = Math.max(mostInFlight, inFlight);
        await new Promise((resolve) => setImmediate(resolve));
        inFlight--;
        return null;
      });

      await update(
        Array.from({ length: 25 }, (_, index) => unbindChange({ workloadId: `rule-${index}` }))
      );

      expect(store.getVerified).toHaveBeenCalledTimes(25);
      expect(mostInFlight).toBe(10);
    });

    it('reports a change that could not be written with the reason it failed', async () => {
      store.bulkSet.mockImplementation(async (written) =>
        written.map((attributes) =>
          attributes.workloadId === 'rule-id'
            ? { ok: false, error: Boom.conflict('The binding was changed concurrently.') }
            : { ok: true, value: binding(attributes) }
        )
      );

      const results = await update([bindChange(), bindChange(OTHER)]);

      expect(results[0]).toEqual({
        ...WORKLOAD,
        op: 'bind',
        ok: false,
        error: { statusCode: 409, message: 'The binding was changed concurrently.' },
      });
      expect(results[1]).toMatchObject({ ok: true });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('fails every change of a write that fails as a whole, and no others', async () => {
      store.bulkSet.mockRejectedValue(new Error('cluster unavailable'));

      const results = await update([
        bindChange(),
        bindChange(OTHER),
        unbindChange({ workloadId: 'third' }),
      ]);

      expect(results.map(({ ok }) => ok)).toEqual([false, false, true]);
      expect(results[0]).toMatchObject({
        error: { statusCode: 500, message: 'An internal server error occurred' },
      });
      // One line for the one error, however many changes it failed.
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to change the bindings of 2 workloads of plugin [alerting], including [rule/rule-id]: cluster unavailable'
      );
    });

    it('reports an unbind that matched no binding', async () => {
      store.getVerified.mockResolvedValue(null);
      store.bulkDelete.mockResolvedValue([{ ok: true, value: false }]);
      getSpaceId.mockReturnValue('marketing');

      await expect(update([unbindChange()])).resolves.toEqual([
        { ...OTHER, op: 'unbind', ok: true, removed: false },
      ]);
      expect(logger.warn).toHaveBeenCalledWith(
        'Unbinding matched no binding for workload [rule/other-rule-id] of plugin [alerting] in space [marketing]'
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

  describe('#getServiceAccountSummary', () => {
    const summary = {
      id: 'service-account-id',
      name: 'Nightshift relay',
      enabled: true,
      assumable: true,
    };

    beforeEach(() => {
      backend.getSummary.mockResolvedValue(summary);
    });

    it('names the account of the verified binding, scoped to the plugin Core supplied', async () => {
      await expect(
        bindings.getServiceAccountSummary(PLUGIN_ID, WORKLOAD_IN_SPACE)
      ).resolves.toEqual(summary);
      expect(store.getVerified).toHaveBeenCalledWith(COORDINATES);
      expect(backend.getSummary).toHaveBeenCalledWith('service-account-id');
    });

    it('resolves `null` without reading an account when the workload is unbound', async () => {
      store.getVerified.mockResolvedValue(null);

      await expect(
        bindings.getServiceAccountSummary(PLUGIN_ID, WORKLOAD_IN_SPACE)
      ).resolves.toBeNull();
      expect(backend.getSummary).not.toHaveBeenCalled();
    });

    it('resolves `null` when the bound account no longer exists', async () => {
      backend.getSummary.mockResolvedValue(null);

      await expect(
        bindings.getServiceAccountSummary(PLUGIN_ID, WORKLOAD_IN_SPACE)
      ).resolves.toBeNull();
    });

    it('propagates a binding that fails its integrity check', async () => {
      const error = new Error('failed integrity verification');
      store.getVerified.mockRejectedValue(error);

      await expect(bindings.getServiceAccountSummary(PLUGIN_ID, WORKLOAD_IN_SPACE)).rejects.toBe(
        error
      );
      expect(backend.getSummary).not.toHaveBeenCalled();
    });

    it('fails closed when security features are disabled in Elasticsearch', async () => {
      license.isEnabled.mockReturnValue(false);

      await expect(
        bindings.getServiceAccountSummary(PLUGIN_ID, WORKLOAD_IN_SPACE)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(store.getVerified).not.toHaveBeenCalled();
      expect(backend.getSummary).not.toHaveBeenCalled();
    });
  });

  describe('#withScopedRequest', () => {
    it('rejects a rebind between the consumer lookup and credential creation', async () => {
      const original = await bindings.getBinding(PLUGIN_ID, WORKLOAD_IN_SPACE);
      store.getVerified.mockResolvedValue({ ...binding(), serviceAccountId: 'another-account' });
      const execute = jest.fn();

      await expect(
        bindings.withScopedRequest(
          PLUGIN_ID,
          { ...WORKLOAD_IN_SPACE, expectedServiceAccountId: original?.serviceAccountId },
          execute
        )
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(backend.createFakeRequest).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    });

    it('mints the expected account when the binding matches', async () => {
      const execute = jest.fn().mockResolvedValue('executed');
      await expect(
        bindings.withScopedRequest(
          PLUGIN_ID,
          { ...WORKLOAD_IN_SPACE, expectedServiceAccountId: 'service-account-id' },
          execute
        )
      ).resolves.toBe('executed');
      expect(backend.createFakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ serviceAccountId: 'service-account-id' })
      );
    });

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

    it('tells the backend when the workload was bound', async () => {
      await bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined);

      expect(backend.createFakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ boundAt: '2026-08-21T00:00:00.000Z' })
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

      it('permits a same-account replacement binding that changed between checks', async () => {
        const interceptor = await captureRefreshInterceptor();
        store.getVerified.mockResolvedValue(binding({ boundAt: '2026-09-23T12:00:00Z' }));
        const mint = jest.fn().mockResolvedValue('fresh-token');
        await expect(interceptor(mint)).resolves.toBe('fresh-token');
      });

      it('allows an exchange already started before unbinding to finish', async () => {
        const interceptor = await captureRefreshInterceptor();
        let finishMint: (token: string) => void = () => {
          throw new Error('Mint has not started');
        };
        const mint = jest.fn(
          () =>
            new Promise<string>((resolve) => {
              finishMint = resolve;
            })
        );
        const inflight = interceptor(mint);
        // Let the binding read complete and the exchange begin before removing the binding.
        await Promise.resolve();
        await Promise.resolve();
        expect(mint).toHaveBeenCalledTimes(1);
        store.getVerified.mockResolvedValue(null);
        finishMint('issued-token');
        await expect(inflight).resolves.toBe('issued-token');
        await expect(interceptor(mint)).rejects.toMatchObject({ output: { statusCode: 404 } });
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

    describe('audit', () => {
      const assumeEvent = (outcome: 'success' | 'failure') => ({
        event: {
          action: 'service_account_assume',
          category: ['authentication'],
          type: ['start'],
          outcome,
        },
      });
      const assumedAccount = (serviceAccountId: string) => ({
        id: serviceAccountId,
        name: serviceAccountId,
      });

      it('logs `success` on the minted request before the callback runs', async () => {
        const execute = jest.fn(async () => {
          expect(auditLogger.log).toHaveBeenCalledTimes(1);
          return 'executed';
        });

        await expect(
          bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, execute)
        ).resolves.toBe('executed');

        expect(audit.asScoped).toHaveBeenCalledTimes(1);
        expect(audit.asScoped).toHaveBeenCalledWith(mintedRequest);
        expect(auditLogger.log).toHaveBeenCalledWith({
          ...assumeEvent('success'),
          message:
            'Workload [alerting/rule/rule-id] is executing as service account [id=service-account-id]',
          user: assumedAccount('service-account-id'),
          kibana: { workload: AUDIT_WORKLOAD },
          error: undefined,
        });
        expect(audit.withoutRequest.log).not.toHaveBeenCalled();
      });

      it('names the run on every event when the caller supplies an execution id', async () => {
        const params = { ...WORKLOAD_IN_SPACE, executionId: 'execution-id' };
        const workload = { ...AUDIT_WORKLOAD, execution_id: 'execution-id' };

        await bindings.withScopedRequest(PLUGIN_ID, params, async () => undefined);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            ...assumeEvent('success'),
            message:
              'Workload [alerting/rule/rule-id] [executionId=execution-id] is executing as service account [id=service-account-id]',
            kibana: { workload },
          })
        );

        backend.createFakeRequest.mockRejectedValueOnce(Boom.notFound('missing stored credential'));
        await expect(
          bindings.withScopedRequest(PLUGIN_ID, params, async () => undefined)
        ).rejects.toMatchObject({ output: { statusCode: 404 } });
        expect(audit.withoutRequest.log).toHaveBeenCalledWith(
          expect.objectContaining({
            ...assumeEvent('failure'),
            kibana: { workload, space_id: 'default' },
          })
        );
      });

      it('logs no second event when the callback throws', async () => {
        await expect(
          bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => {
            throw new Error('execution failed');
          })
        ).rejects.toThrowError('execution failed');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining(assumeEvent('success'))
        );
      });

      it('logs nothing when the workload has no binding', async () => {
        store.getVerified.mockResolvedValue(null);

        await expect(
          bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined)
        ).rejects.toMatchObject({ output: { statusCode: 404 } });

        expect(auditLogger.log).not.toHaveBeenCalled();
        expect(audit.withoutRequest.log).not.toHaveBeenCalled();
      });

      it('logs `failure` without naming an account when the binding fails integrity verification', async () => {
        store.getVerified.mockRejectedValue(
          Boom.forbidden(
            'The service account binding for this workload failed integrity verification.'
          )
        );

        await expect(
          bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined)
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(audit.asScoped).not.toHaveBeenCalled();
        expect(audit.withoutRequest.log).toHaveBeenCalledTimes(1);
        expect(audit.withoutRequest.log).toHaveBeenCalledWith({
          ...assumeEvent('failure'),
          message: 'Workload [alerting/rule/rule-id] failed to execute as its service account',
          kibana: { workload: AUDIT_WORKLOAD, space_id: 'default' },
          error: {
            code: 'Error',
            message: 'The service account binding for this workload failed integrity verification.',
          },
        });
      });

      it('logs nothing when the binding cannot be read', async () => {
        store.getVerified.mockRejectedValue(new Error('saved objects unavailable'));

        await expect(
          bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined)
        ).rejects.toThrowError('saved objects unavailable');

        expect(audit.withoutRequest.log).not.toHaveBeenCalled();
      });

      it('logs `failure` naming the bound account when it is not the one the caller expected', async () => {
        store.getVerified.mockResolvedValue(binding({ serviceAccountId: 'another-account' }));

        await expect(
          bindings.withScopedRequest(
            PLUGIN_ID,
            { ...WORKLOAD_IN_SPACE, expectedServiceAccountId: 'service-account-id' },
            async () => undefined
          )
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(audit.withoutRequest.log).toHaveBeenCalledTimes(1);
        expect(audit.withoutRequest.log).toHaveBeenCalledWith(
          expect.objectContaining({
            ...assumeEvent('failure'),
            user: assumedAccount('another-account'),
            kibana: { workload: AUDIT_WORKLOAD, space_id: 'default' },
          })
        );
      });

      // The shapes the backends really reject with: the exchange's own failures are wrapped, and
      // the Elasticsearch backend's refusals of a stored credential are not.
      const exchangeFailure = (retryable: boolean, statusCode?: number) =>
        new ServiceAccountTokenExchangeError(
          new Error('Service account token exchange failed for [service-account-id].'),
          { retryable, statusCode }
        );

      it.each([
        [
          'the account is gone',
          exchangeFailure(false, 404),
          {
            code: 'ServiceAccountTokenExchangeError',
            message: 'Error occurred during service account token exchange (status 404).',
          },
        ],
        [
          'the account was created after the workload was bound',
          Boom.forbidden(
            'The workload was bound to an earlier service account with the same name.'
          ),
          {
            code: 'Error',
            message: 'The workload was bound to an earlier service account with the same name.',
          },
        ],
      ])('logs `failure` without a request when %s', async (_name, error, auditedError) => {
        backend.createFakeRequest.mockRejectedValue(error);
        const execute = jest.fn();

        await expect(
          bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, execute)
        ).rejects.toBe(error);

        expect(execute).not.toHaveBeenCalled();
        expect(audit.asScoped).not.toHaveBeenCalled();
        expect(audit.withoutRequest.log).toHaveBeenCalledTimes(1);
        expect(audit.withoutRequest.log).toHaveBeenCalledWith({
          ...assumeEvent('failure'),
          message:
            'Workload [alerting/rule/rule-id] failed to execute as service account [id=service-account-id]',
          user: assumedAccount('service-account-id'),
          kibana: { workload: AUDIT_WORKLOAD, space_id: 'default' },
          error: auditedError,
        });
      });

      it.each([
        ['an unavailable exchange', exchangeFailure(true, 503)],
        ['a transport failure', exchangeFailure(true)],
      ])('logs nothing when the exchange fails with %s', async (_name, error) => {
        backend.createFakeRequest.mockRejectedValue(error);

        await expect(
          bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined)
        ).rejects.toBe(error);

        expect(auditLogger.log).not.toHaveBeenCalled();
        expect(audit.withoutRequest.log).not.toHaveBeenCalled();
      });

      describe('on a re-mint', () => {
        const captureRefreshInterceptor = async (): Promise<ServiceAccountMintInterceptor> => {
          await bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined);
          const [[params]] = backend.createFakeRequest.mock.calls;
          await params.mintInterceptor!(jest.fn().mockResolvedValue('essu_initial'));
          audit.asScoped.mockClear();
          auditLogger.log.mockClear();
          return params.mintInterceptor!;
        };

        it.each([
          ['the workload was re-bound', () => binding({ serviceAccountId: 'a-different-account' })],
          ['the workload was unbound', () => null],
        ])('logs `failure` on the minted request when %s', async (_name, current) => {
          const interceptor = await captureRefreshInterceptor();
          store.getVerified.mockResolvedValue(current());

          await expect(interceptor(jest.fn())).rejects.toBeDefined();

          expect(audit.asScoped).toHaveBeenCalledWith(mintedRequest);
          expect(auditLogger.log).toHaveBeenCalledTimes(1);
          expect(auditLogger.log).toHaveBeenCalledWith(
            expect.objectContaining({
              ...assumeEvent('failure'),
              user: assumedAccount('service-account-id'),
              kibana: { workload: AUDIT_WORKLOAD },
            })
          );
          expect(audit.withoutRequest.log).not.toHaveBeenCalled();
        });

        it.each([
          ['the account is gone', exchangeFailure(false, 404)],
          [
            'the account was created after the workload was bound',
            Boom.forbidden(
              'The workload was bound to an earlier service account with the same name.'
            ),
          ],
        ])(
          'logs `failure` on the minted request when the binding holds but %s',
          async (_name, error) => {
            const interceptor = await captureRefreshInterceptor();

            await expect(interceptor(jest.fn().mockRejectedValue(error))).rejects.toBe(error);

            expect(audit.asScoped).toHaveBeenCalledWith(mintedRequest);
            expect(auditLogger.log).toHaveBeenCalledTimes(1);
            expect(auditLogger.log).toHaveBeenCalledWith(
              expect.objectContaining({
                ...assumeEvent('failure'),
                user: assumedAccount('service-account-id'),
                kibana: { workload: AUDIT_WORKLOAD },
                error: { code: error.name, message: error.message },
              })
            );
            expect(audit.withoutRequest.log).not.toHaveBeenCalled();
          }
        );

        it('logs nothing when the binding holds but the exchange is unavailable', async () => {
          const interceptor = await captureRefreshInterceptor();
          const error = exchangeFailure(true, 503);

          await expect(interceptor(jest.fn().mockRejectedValue(error))).rejects.toBe(error);

          expect(auditLogger.log).not.toHaveBeenCalled();
          expect(audit.withoutRequest.log).not.toHaveBeenCalled();
        });

        it.each([
          ['an unavailable store', Boom.serverUnavailable('saved objects unavailable')],
          ['a rate limit', Boom.tooManyRequests('slow down')],
          ['an unexpected exception', new Error('boom')],
        ])('logs nothing for %s, which the registry retries', async (_name, error) => {
          const interceptor = await captureRefreshInterceptor();
          store.getVerified.mockRejectedValue(error);

          await expect(interceptor(jest.fn())).rejects.toBe(error);

          expect(auditLogger.log).not.toHaveBeenCalled();
          expect(audit.withoutRequest.log).not.toHaveBeenCalled();
        });

        it('logs one `failure` without a request when the refusal comes before the request exists', async () => {
          store.getVerified
            .mockResolvedValueOnce(binding())
            .mockResolvedValueOnce(binding({ serviceAccountId: 'a-different-account' }));
          backend.createFakeRequest.mockImplementation(async ({ mintInterceptor }) => {
            await mintInterceptor!(jest.fn().mockResolvedValue('essu_initial'));
            await mintInterceptor!(jest.fn());
            return mintedRequest;
          });

          await expect(
            bindings.withScopedRequest(PLUGIN_ID, WORKLOAD_IN_SPACE, async () => undefined)
          ).rejects.toMatchObject({ output: { statusCode: 403 } });

          expect(audit.withoutRequest.log).toHaveBeenCalledTimes(1);
          expect(audit.withoutRequest.log).toHaveBeenCalledWith(
            expect.objectContaining({
              ...assumeEvent('failure'),
              user: assumedAccount('service-account-id'),
              kibana: { workload: AUDIT_WORKLOAD, space_id: 'default' },
            })
          );
          expect(audit.asScoped).not.toHaveBeenCalled();
        });
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
        'bulkUpdateWorkloadBindings',
        (api: ServiceAccountWorkloadBindings) =>
          api.bulkUpdateWorkloadBindings(PLUGIN_ID, httpServerMock.createKibanaRequest(), [
            { op: 'unbind', ...WORKLOAD },
          ]),
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
      expect(store.bulkSet).not.toHaveBeenCalled();
      expect(store.bulkDelete).not.toHaveBeenCalled();
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
