/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectAccessControl } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import {
  ensureConnectorAccess,
  filterAccessibleConnectors,
  getConnectorAccessControl,
  getConnectorPermissions,
  updateConnectorAccessControl,
} from './connector_access_control';

const OWNER = 'owner-uid';
const EXECUTOR = 'executor-uid';
const STRANGER = 'stranger-uid';

const restricted: SavedObjectAccessControl = {
  owner: OWNER,
  accessMode: 'private',
  entries: [{ type: 'user', id: EXECUTOR, role: 'executor', added_at: '2026-01-01T00:00:00.000Z' }],
};

const createContext = (profileId: string | undefined) => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  return {
    request: httpServerMock.createKibanaRequest(),
    getCurrentUserProfileId: jest.fn().mockResolvedValue(profileId),
    unsecuredSavedObjectsClient,
    authorization: { ensureAuthorized: jest.fn() },
  };
};

describe('getConnectorPermissions', () => {
  it('grants everything on a public connector', () => {
    expect(getConnectorPermissions(undefined, STRANGER)).toEqual({
      read: true,
      execute: true,
      edit: true,
      manage: true,
    });
  });

  it('grants everything to the owner of a restricted connector', () => {
    expect(getConnectorPermissions(restricted, OWNER)).toEqual({
      read: true,
      execute: true,
      edit: true,
      manage: true,
    });
  });

  it('lets an executor read and run but not edit or manage', () => {
    expect(getConnectorPermissions(restricted, EXECUTOR)).toEqual({
      read: true,
      execute: true,
      edit: false,
      manage: false,
    });
  });

  it('denies everything to an unlisted user', () => {
    expect(getConnectorPermissions(restricted, STRANGER)).toEqual({
      read: false,
      execute: false,
      edit: false,
      manage: false,
    });
  });

  it('denies management when the user has no profile', () => {
    expect(getConnectorPermissions(undefined, undefined).manage).toBe(false);
  });
});

describe('ensureConnectorAccess', () => {
  it('does not resolve a profile for public connectors', async () => {
    const context = createContext(STRANGER);
    await ensureConnectorAccess(context, { id: 'c1' }, 'execute');
    expect(context.getCurrentUserProfileId).not.toHaveBeenCalled();
  });

  it('hides restricted connectors from unlisted users on reads', async () => {
    await expect(
      ensureConnectorAccess(
        createContext(STRANGER),
        { id: 'c1', accessControl: restricted },
        'read'
      )
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('forbids an executor from editing', async () => {
    await expect(
      ensureConnectorAccess(
        createContext(EXECUTOR),
        { id: 'c1', accessControl: restricted },
        'edit'
      )
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
  });

  it('hides a restricted connector from unlisted users on writes too', async () => {
    await expect(
      ensureConnectorAccess(
        createContext(STRANGER),
        { id: 'c1', accessControl: restricted },
        'edit'
      )
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('allows an executor to run', async () => {
    await expect(
      ensureConnectorAccess(
        createContext(EXECUTOR),
        { id: 'c1', accessControl: restricted },
        'execute'
      )
    ).resolves.toBeUndefined();
  });
});

describe('filterAccessibleConnectors', () => {
  const connectors = [{ id: 'public' }, { id: 'restricted', accessControl: restricted }];

  it('keeps every connector for the owner', async () => {
    await expect(filterAccessibleConnectors(createContext(OWNER), connectors)).resolves.toEqual(
      connectors
    );
  });

  it('omits restricted connectors for unlisted users', async () => {
    await expect(filterAccessibleConnectors(createContext(STRANGER), connectors)).resolves.toEqual([
      { id: 'public' },
    ]);
  });

  it('skips profile resolution when nothing is restricted', async () => {
    const context = createContext(STRANGER);
    await filterAccessibleConnectors(context, [{ id: 'public' }]);
    expect(context.getCurrentUserProfileId).not.toHaveBeenCalled();
  });
});

describe('getConnectorAccessControl', () => {
  it('discloses the access control to the owner', async () => {
    const context = createContext(OWNER);
    context.unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'c1',
      type: 'action',
      references: [],
      attributes: {},
      accessControl: restricted,
    });

    await expect(getConnectorAccessControl(context, 'c1')).resolves.toEqual({
      permissions: { read: true, execute: true, edit: true, manage: true },
      owner: OWNER,
      access_control: {
        access_mode: 'private',
        entries: [
          { type: 'user', id: EXECUTOR, role: 'executor', added_at: '2026-01-01T00:00:00.000Z' },
        ],
      },
    });
  });

  it('only returns permissions to an executor', async () => {
    const context = createContext(EXECUTOR);
    context.unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'c1',
      type: 'action',
      references: [],
      attributes: {},
      accessControl: restricted,
    });

    await expect(getConnectorAccessControl(context, 'c1')).resolves.toEqual({
      permissions: { read: true, execute: true, edit: false, manage: false },
    });
  });
});

describe('updateConnectorAccessControl', () => {
  it('makes the first user to restrict a connector its owner', async () => {
    const context = createContext(OWNER);
    context.unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'c1',
      type: 'action',
      references: [],
      attributes: {},
    });
    context.unsecuredSavedObjectsClient.changeAccessControl.mockResolvedValue({
      objects: [{ type: 'action', id: 'c1' }],
    });

    await updateConnectorAccessControl(
      context,
      'c1',
      { access_mode: 'private', entries: [{ type: 'user', id: EXECUTOR, role: 'executor' }] },
      jest.fn()
    );

    expect(context.unsecuredSavedObjectsClient.changeAccessControl).toHaveBeenCalledWith(
      [{ type: 'action', id: 'c1' }],
      {
        accessMode: 'private',
        entries: [{ type: 'user', id: EXECUTOR, role: 'executor' }],
        roles: ['executor'],
        owner: OWNER,
      }
    );
  });

  it('validates only the newly added recipients', async () => {
    const context = createContext(OWNER);
    context.unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'c1',
      type: 'action',
      references: [],
      attributes: {},
      accessControl: restricted,
    });
    context.unsecuredSavedObjectsClient.changeAccessControl.mockResolvedValue({
      objects: [{ type: 'action', id: 'c1' }],
    });
    const validateRecipients = jest.fn();

    await updateConnectorAccessControl(
      context,
      'c1',
      {
        access_mode: 'private',
        entries: [
          { type: 'user', id: EXECUTOR, role: 'executor' },
          { type: 'user', id: STRANGER, role: 'executor' },
        ],
      },
      validateRecipients
    );

    expect(validateRecipients).toHaveBeenCalledWith(new Set([STRANGER]));
  });

  it('drops the entries when a connector is made public again', async () => {
    const context = createContext(OWNER);
    context.unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'c1',
      type: 'action',
      references: [],
      attributes: {},
      accessControl: restricted,
    });
    context.unsecuredSavedObjectsClient.changeAccessControl.mockResolvedValue({
      objects: [{ type: 'action', id: 'c1' }],
    });

    await updateConnectorAccessControl(
      context,
      'c1',
      { access_mode: 'public', entries: [] },
      jest.fn()
    );

    expect(context.unsecuredSavedObjectsClient.changeAccessControl).toHaveBeenCalledWith(
      [{ type: 'action', id: 'c1' }],
      { accessMode: 'default', entries: [], roles: ['executor'], owner: OWNER }
    );
  });

  it('rejects a user that does not own the connector', async () => {
    const context = createContext(EXECUTOR);
    context.unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'c1',
      type: 'action',
      references: [],
      attributes: {},
      accessControl: restricted,
    });

    await expect(
      updateConnectorAccessControl(context, 'c1', { access_mode: 'public', entries: [] }, jest.fn())
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
    expect(context.unsecuredSavedObjectsClient.changeAccessControl).not.toHaveBeenCalled();
  });
});
