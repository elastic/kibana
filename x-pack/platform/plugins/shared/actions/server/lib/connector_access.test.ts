/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { CanonicalAcl } from '@kbn/access-control';
import {
  ensureConnectorOperation,
  getConnectorSpaceId,
  operationForAuthMode,
} from './connector_access';

const ACL: CanonicalAcl = {
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general_access: ['none'],
  entries: [],
};

describe('ensureConnectorOperation', () => {
  const createContext = ({
    enabled = true,
    spaceId,
  }: { enabled?: boolean; spaceId?: string } = {}) => {
    const securityService = securityServiceMock.createStart();
    const scoped = securityServiceMock.createScopedAccessControl();
    securityService.accessControl.asScoped.mockReturnValue(scoped);
    scoped.isEnabled.mockReturnValue(enabled);
    return {
      context: {
        request: httpServerMock.createKibanaRequest(),
        securityService,
        spaceId,
        spaces: { getSpaceId: jest.fn().mockReturnValue('request-space') },
      },
      scoped,
    };
  };

  it('does nothing while object-level security is disabled', async () => {
    const { context, scoped } = createContext({ enabled: false });

    await ensureConnectorOperation(context, { id: 'c1', acl: ACL, operation: 'use' });

    expect(scoped.authorize).not.toHaveBeenCalled();
  });

  it('decides the operation in the connector space', async () => {
    const { context, scoped } = createContext({ spaceId: 'override-space' });
    scoped.authorize.mockResolvedValue(new Map([['c1', { status: 'allowed' }]]));

    await ensureConnectorOperation(context, { id: 'c1', acl: ACL, operation: 'edit' });

    expect(scoped.authorize).toHaveBeenCalledWith({
      type: 'action',
      spaceId: 'override-space',
      operation: 'edit',
      objects: [{ id: 'c1', acl: ACL }],
    });
  });

  it('reports a connector the caller cannot view as missing', async () => {
    const { context, scoped } = createContext();
    scoped.authorize.mockResolvedValue(new Map([['c1', { status: 'not_found' }]]));

    const error = await ensureConnectorOperation(context, {
      id: 'c1',
      acl: ACL,
      operation: 'use',
    }).catch((e) => e);

    expect(SavedObjectsErrorHelpers.isNotFoundError(error)).toBe(true);
  });

  it('reports a missing permission on a visible connector as forbidden', async () => {
    const { context, scoped } = createContext();
    scoped.authorize.mockResolvedValue(
      new Map([['c1', { status: 'forbidden', operation: 'delete' }]])
    );

    await expect(
      ensureConnectorOperation(context, { id: 'c1', acl: ACL, operation: 'delete' })
    ).rejects.toMatchObject({
      output: { statusCode: 403 },
      message: 'Unable to delete connector: missing "delete" permission',
    });
  });
});

describe('getConnectorSpaceId', () => {
  it('prefers the explicit space, then the request space, then the default space', () => {
    const request = httpServerMock.createKibanaRequest();
    const spaces = { getSpaceId: jest.fn().mockReturnValue('request-space') };

    expect(getConnectorSpaceId({ request, spaces, spaceId: 'explicit' })).toBe('explicit');
    expect(getConnectorSpaceId({ request, spaces })).toBe('request-space');
    expect(getConnectorSpaceId({ request })).toBe('default');
  });
});

describe('operationForAuthMode', () => {
  it('needs only use for per-user flows, and edit for shared credentials', () => {
    expect(operationForAuthMode('per-user')).toBe('use');
    expect(operationForAuthMode('shared')).toBe('edit');
    expect(operationForAuthMode(undefined)).toBe('edit');
  });
});
