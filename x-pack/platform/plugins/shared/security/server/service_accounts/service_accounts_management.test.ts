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
import type {
  AuditLogger,
  CheckPrivileges,
  CheckPrivilegesResponse,
} from '@kbn/security-plugin-types-server';

import type { WorkloadBindingStore } from './bindings';
import { ServiceAccountsManagement } from './service_accounts_management';
import { serviceAccountsServiceMock } from './service_accounts_service.mock';
import type { ServiceAccountsBackend } from './types';
import { licenseMock } from '../../common/licensing/index.mock';
import { auditLoggerMock, auditServiceMock } from '../audit/mocks';

const SERVICE_ACCOUNT_ID = 'service-account-id';

const binding = (
  overrides: Partial<ServiceAccountWorkloadBinding> = {}
): ServiceAccountWorkloadBinding => ({
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId: 'workflow-1',
  serviceAccountId: SERVICE_ACCOUNT_ID,
  spaceId: 'default',
  boundBy: { type: 'user', username: 'elastic' },
  boundAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const workloadOf = ({ pluginId, workloadType, workloadId }: ServiceAccountWorkloadBinding) => ({
  pluginId,
  workloadType,
  workloadId,
  displayName: workloadId,
});

const coordinatesOf = ({
  pluginId,
  workloadType,
  workloadId,
  spaceId,
}: ServiceAccountWorkloadBinding) => ({ pluginId, workloadType, workloadId, spaceId });

const clusterPrivilegesResponse = (authorized: boolean) =>
  ({ hasAllRequested: authorized } as unknown as CheckPrivilegesResponse);

describe('ServiceAccountsManagement', () => {
  let management: ServiceAccountsManagement;
  let backend: jest.Mocked<ServiceAccountsBackend>;
  let store: jest.Mocked<WorkloadBindingStore>;
  let license: ReturnType<typeof licenseMock.create>;
  let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;
  let request: KibanaRequest;
  let audit: ReturnType<typeof auditServiceMock.create>;
  let auditLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    audit = auditServiceMock.create();
    auditLogger = auditLoggerMock.create();
    audit.asScoped.mockReturnValue(auditLogger);
    license = licenseMock.create();
    license.isEnabled.mockReturnValue(true);
    backend = serviceAccountsServiceMock.createStart()
      .backend as jest.Mocked<ServiceAccountsBackend>;
    store = {
      findByServiceAccountId: jest.fn().mockResolvedValue([]),
      getVerified: jest.fn(),
    } as unknown as jest.Mocked<WorkloadBindingStore>;
    mockCheckPrivileges = { globally: jest.fn() } as unknown as jest.Mocked<CheckPrivileges>;
    mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(true));
    request = httpServerMock.createKibanaRequest();

    management = new ServiceAccountsManagement({
      logger: loggingSystemMock.createLogger(),
      license,
      backend,
      store,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
      audit,
    });
  });

  describe('#listWorkloads', () => {
    it('lists the verified bound workloads after checking `manage_security`, without their spaces', async () => {
      const bindings = [binding(), binding({ workloadId: 'workflow-2', spaceId: 'other' })];
      store.findByServiceAccountId.mockResolvedValue(bindings);
      store.getVerified.mockImplementation(
        async ({ workloadId }) => bindings.find((candidate) => candidate.workloadId === workloadId)!
      );

      const workloads = await management.listWorkloads(request, SERVICE_ACCOUNT_ID);
      expect(workloads).toStrictEqual(bindings.map(workloadOf));
      for (const workload of workloads) {
        expect(workload).not.toHaveProperty('spaceId');
      }

      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
      expect(store.findByServiceAccountId).toHaveBeenCalledWith(SERVICE_ACCOUNT_ID);
      expect(store.getVerified).toHaveBeenCalledTimes(2);
    });

    it('lists the same workloads a delete would be refused for', async () => {
      const kept = binding({ workloadId: 'kept' });
      const tampered = binding({ workloadId: 'tampered' });
      const removed = binding({ workloadId: 'removed' });
      store.findByServiceAccountId.mockResolvedValue([kept, tampered, removed]);
      store.getVerified.mockImplementation(async ({ workloadId }) => {
        if (workloadId === 'tampered') {
          throw Boom.forbidden('failed integrity verification');
        }
        return workloadId === 'kept' ? kept : null;
      });

      await expect(management.listWorkloads(request, SERVICE_ACCOUNT_ID)).resolves.toStrictEqual([
        workloadOf(kept),
        workloadOf(tampered),
      ]);
    });

    it('rejects with a 403 before searching when the caller lacks `manage_security`', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(management.listWorkloads(request, SERVICE_ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(store.findByServiceAccountId).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      license.isEnabled.mockReturnValue(false);

      await expect(management.listWorkloads(request, SERVICE_ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(mockCheckPrivileges.globally).not.toHaveBeenCalled();
    });
  });

  describe('#delete', () => {
    it('deletes an account with no bound workloads', async () => {
      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
      ).resolves.toEqual({ deleted: true, warnings: [] });

      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
      expect(backend.delete).toHaveBeenCalledWith(request, SERVICE_ACCOUNT_ID);
    });

    it('refuses to delete an account that is still bound, and reports the workloads', async () => {
      const bound = binding();
      store.findByServiceAccountId.mockResolvedValue([bound]);
      store.getVerified.mockResolvedValue(bound);

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
      ).resolves.toEqual({ deleted: false, workloads: [workloadOf(bound)] });

      expect(store.getVerified).toHaveBeenCalledWith(coordinatesOf(bound));
      expect(backend.delete).not.toHaveBeenCalled();
    });

    it('still refuses when a binding fails integrity verification', async () => {
      const bound = binding();
      store.findByServiceAccountId.mockResolvedValue([bound]);
      store.getVerified.mockRejectedValue(
        Boom.forbidden(
          'The service account binding for this workload failed integrity verification.'
        )
      );

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
      ).resolves.toEqual({ deleted: false, workloads: [workloadOf(bound)] });
      expect(backend.delete).not.toHaveBeenCalled();
    });

    it('ignores bindings that were removed or rebound after the search', async () => {
      const removed = binding({ workloadId: 'removed' });
      const rebound = binding({ workloadId: 'rebound' });
      store.findByServiceAccountId.mockResolvedValue([removed, rebound]);
      store.getVerified
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...rebound, serviceAccountId: 'another-account' });

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
      ).resolves.toEqual({ deleted: true, warnings: [] });
      expect(backend.delete).toHaveBeenCalledWith(request, SERVICE_ACCOUNT_ID);
    });

    it('propagates a failure to read a binding that is not a verification failure', async () => {
      const error = new Error('saved objects unavailable');
      store.findByServiceAccountId.mockResolvedValue([binding()]);
      store.getVerified.mockRejectedValue(error);

      await expect(management.delete(request, SERVICE_ACCOUNT_ID, { force: false })).rejects.toBe(
        error
      );
      expect(backend.delete).not.toHaveBeenCalled();
    });

    it('deletes a bound account without looking at its bindings when forced', async () => {
      store.findByServiceAccountId.mockResolvedValue([binding()]);

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: true })
      ).resolves.toEqual({ deleted: true, warnings: [] });

      expect(store.findByServiceAccountId).not.toHaveBeenCalled();
      expect(backend.delete).toHaveBeenCalledWith(request, SERVICE_ACCOUNT_ID);
    });

    it('rejects with a 403 before reading bindings when the caller lacks `manage_security`', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(store.findByServiceAccountId).not.toHaveBeenCalled();
      expect(backend.delete).not.toHaveBeenCalled();
    });

    it('passes the backend warnings through', async () => {
      backend.delete.mockResolvedValue({ warnings: ['a token could not be deleted'] });

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
      ).resolves.toEqual({ deleted: true, warnings: ['a token could not be deleted'] });
    });

    it('propagates a backend failure', async () => {
      backend.delete.mockRejectedValue(Boom.notFound('Service account was not found'));

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
    });

    it('checks `manage_security` itself when forced', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(
        management.delete(request, SERVICE_ACCOUNT_ID, { force: true })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(backend.delete).not.toHaveBeenCalled();
    });

    describe('audit', () => {
      const deleteEvent = (outcome: 'unknown' | 'failure', message: string) =>
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'service_account_delete',
            category: ['iam'],
            type: ['user', 'deletion'],
            outcome,
          }),
          user: { target: { id: SERVICE_ACCOUNT_ID } },
          message,
        });

      it('logs `unknown` scoped to the request before the backend deletes the account', async () => {
        backend.delete.mockImplementation(async () => {
          expect(auditLogger.log).toHaveBeenCalledTimes(1);
          return { warnings: [] };
        });

        await management.delete(request, SERVICE_ACCOUNT_ID, { force: false });

        expect(audit.asScoped).toHaveBeenCalledWith(request);
        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          deleteEvent('unknown', `User is deleting service account [id=${SERVICE_ACCOUNT_ID}]`)
        );
        expect(backend.delete).toHaveBeenCalledTimes(1);
      });

      it('records a forced delete in the message', async () => {
        await management.delete(request, SERVICE_ACCOUNT_ID, { force: true });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          deleteEvent(
            'unknown',
            `User is deleting service account [id=${SERVICE_ACCOUNT_ID}] [force=true]`
          )
        );
      });

      it('logs `failure` without reading the bindings when the caller lacks `manage_security`', async () => {
        mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

        await expect(
          management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(store.findByServiceAccountId).not.toHaveBeenCalled();
        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          deleteEvent(
            'failure',
            `Failed attempt to delete service account [id=${SERVICE_ACCOUNT_ID}]`
          )
        );
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              code: 'Error',
              message:
                'Cannot delete a service account: missing `manage_security` cluster privilege',
            },
          })
        );
      });

      it('logs `failure` with force when a forced delete is refused', async () => {
        mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

        await expect(
          management.delete(request, SERVICE_ACCOUNT_ID, { force: true })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          deleteEvent(
            'failure',
            `Failed attempt to delete service account [id=${SERVICE_ACCOUNT_ID}] [force=true]`
          )
        );
      });

      it('logs nothing when the account is still bound', async () => {
        const bound = binding();
        store.findByServiceAccountId.mockResolvedValue([bound]);
        store.getVerified.mockResolvedValue(bound);

        await expect(
          management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
        ).resolves.toMatchObject({ deleted: false });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when security features are disabled', async () => {
        license.isEnabled.mockReturnValue(false);

        await expect(
          management.delete(request, SERVICE_ACCOUNT_ID, { force: true })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing further when the backend delete fails', async () => {
        backend.delete.mockRejectedValue(Boom.notFound('Service account was not found'));

        await expect(
          management.delete(request, SERVICE_ACCOUNT_ID, { force: false })
        ).rejects.toMatchObject({ output: { statusCode: 404 } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          deleteEvent('unknown', `User is deleting service account [id=${SERVICE_ACCOUNT_ID}]`)
        );
      });
    });
  });
});
