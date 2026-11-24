/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AclChangeError, type StoredAcl } from '@kbn/ols';

import { SavedObjectsOlsExtension } from './saved_objects_ols_extension';
import { auditLoggerMock } from '../audit/mocks';
import { createScopedAuditLogger } from '../authorization/ols/audit';
import { scopedOlsServiceMock } from '../authorization/ols/scoped_ols_service.mock';

const ACL: StoredAcl = {
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general: { access: ['none'] },
  entries: [],
};

describe('SavedObjectsOlsExtension', () => {
  let olsService: ReturnType<typeof scopedOlsServiceMock.create>;
  let auditLogger: ReturnType<typeof auditLoggerMock.create>;
  let extension: SavedObjectsOlsExtension;
  beforeEach(() => {
    olsService = scopedOlsServiceMock.create();
    auditLogger = auditLoggerMock.create();
    extension = new SavedObjectsOlsExtension(olsService, auditLogger);
  });

  describe('#getReadFilters', () => {
    it('returns a filter for each type that needs one', async () => {
      olsService.getReadFilter.mockImplementation(async ({ type }) =>
        type === 'action' ? { match_none: {} } : undefined
      );

      const filters = await extension.getReadFilters({
        namespacesByType: new Map([
          ['action', ['default', 'space-a']],
          ['dashboard', ['default']],
        ]),
      });

      expect(filters).toEqual(new Map([['action', { match_none: {} }]]));
      expect(olsService.getReadFilter).toHaveBeenCalledWith({
        type: 'action',
        spaceIds: ['default', 'space-a'],
      });
      expect(olsService.getReadFilter).toHaveBeenCalledWith({
        type: 'dashboard',
        spaceIds: ['default'],
      });
    });
  });

  describe('#authorizeObjects', () => {
    it('authorizes each type once and keys decisions by type and ID', async () => {
      olsService.authorizeObjectAccess.mockImplementation(async ({ type, objects }) => {
        return new Map(
          objects.map(({ id }) => [
            id,
            type === 'action' ? { status: 'not_found' as const } : { status: 'allowed' as const },
          ])
        );
      });
      const objects = [
        { type: 'action', id: '1', acl: ACL },
        { type: 'dashboard', id: '1' },
        { type: 'action', id: '2' },
      ];

      const decisions = await extension.authorizeObjects({
        operation: 'view',
        namespace: 'space-a',
        objects,
      });

      expect(decisions).toEqual(
        new Map([
          ['action:1', { status: 'not_found' }],
          ['action:2', { status: 'not_found' }],
          ['dashboard:1', { status: 'allowed' }],
        ])
      );
      expect(olsService.authorizeObjectAccess).toHaveBeenCalledTimes(2);
      expect(olsService.authorizeObjectAccess).toHaveBeenCalledWith({
        type: 'action',
        spaceId: 'space-a',
        operation: 'view',
        objects: [objects[0], objects[2]],
      });
      expect(olsService.authorizeObjectAccess).toHaveBeenCalledWith({
        type: 'dashboard',
        spaceId: 'space-a',
        operation: 'view',
        objects: [objects[1]],
      });
    });

    it('authorizes objects in the default namespace in the default space', async () => {
      olsService.authorizeObjectAccess.mockResolvedValue(new Map());

      await extension.authorizeObjects({
        operation: 'view',
        namespace: undefined,
        objects: [{ type: 'action', id: '1' }],
      });

      expect(olsService.authorizeObjectAccess).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default' })
      );
    });
  });

  describe('#getInitialAcl', () => {
    it('returns the ACL from the service for the space', async () => {
      const acl = {
        version: 1 as const,
        owner: { type: 'user' as const, id: 'u_owner' },
        general: { access: 'none' as const },
        entries: [],
      };
      olsService.prepareInitialAcl.mockResolvedValue(acl);

      await expect(
        extension.getInitialAcl({
          type: 'action',
          id: '1',
          namespace: undefined,
          requested: undefined,
        })
      ).resolves.toBe(acl);
      expect(olsService.prepareInitialAcl).toHaveBeenCalledWith({
        type: 'action',
        id: '1',
        spaceId: 'default',
        requested: undefined,
      });
    });

    it('turns a rejected request into a bad request', async () => {
      olsService.prepareInitialAcl.mockRejectedValue(new AclChangeError('bad_request', 'No.'));

      const error = await extension
        .getInitialAcl({ type: 'action', id: '1', namespace: 'space-a' })
        .catch((e) => e);

      expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
    });
  });

  describe('#authorizeAclChange', () => {
    const authorizeAclChange = () =>
      extension.authorizeAclChange({
        namespace: 'space-a',
        object: { type: 'action', id: '1', acl: ACL },
        change: { kind: 'claim' },
      });

    it('authorizes the change in the object space and logs its audit events', async () => {
      const result = {
        next: {
          version: 1 as const,
          owner: { type: 'user' as const, id: 'u_owner' },
          general: { access: 'none' as const },
          entries: [],
        },
        warnings: [],
      };
      const auditEvent = { message: 'changed', event: { action: 'ols_transfer' } };
      olsService.authorizeChange.mockResolvedValue({ ...result, auditEvents: [auditEvent] });

      await expect(authorizeAclChange()).resolves.toEqual(result);
      expect(auditLogger.log).toHaveBeenCalledWith(auditEvent);
      expect(olsService.authorizeChange).toHaveBeenCalledWith({
        type: 'action',
        id: '1',
        spaceId: 'space-a',
        acl: ACL,
        change: { kind: 'claim' },
      });
    });

    it.each([
      ['bad_request', 400],
      ['forbidden', 403],
      ['not_found', 404],
      ['conflict', 409],
    ] as const)('maps a %s error to a %s Saved Objects error', async (code, statusCode) => {
      olsService.authorizeChange.mockRejectedValue(new AclChangeError(code, 'No.'));

      const error = await authorizeAclChange().catch((e) => e);

      expect(SavedObjectsErrorHelpers.isSavedObjectsClientError(error)).toBe(true);
      expect(error.output.statusCode).toBe(statusCode);
    });

    it('rethrows other errors unchanged', async () => {
      const failure = new Error('boom');
      olsService.authorizeChange.mockRejectedValue(failure);

      await expect(authorizeAclChange()).rejects.toBe(failure);
    });
  });

  describe('#runInAuditScope', () => {
    it('holds scoped audit events until the operation completes', async () => {
      const scopedLogger = createScopedAuditLogger(auditLogger);
      const event = { message: 'event', event: { action: 'saved_object_get' } };

      await expect(
        extension.runInAuditScope(async () => {
          scopedLogger.log(event);
          expect(auditLogger.log).not.toHaveBeenCalled();
          return 'result';
        })
      ).resolves.toBe('result');

      expect(auditLogger.log).toHaveBeenCalledWith(event);
    });
  });
});
