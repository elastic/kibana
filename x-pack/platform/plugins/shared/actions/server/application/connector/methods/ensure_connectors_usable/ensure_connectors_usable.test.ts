/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CanonicalAcl, Principal } from '@kbn/access-control';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import type { ActionsClientContext } from '../../../../actions_client';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import type { AuthTypeRegistry } from '../../../../auth_types/auth_type_registry';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { ensureConnectorsUsable } from './ensure_connectors_usable';

const ACL: CanonicalAcl = {
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general_access: ['none'],
  entries: [],
};
const PRINCIPAL: Principal = { type: 'user', id: 'u_owner' };

const createContext = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const securityService = securityServiceMock.createStart();
  const scoped = securityServiceMock.createScopedAccessControl();
  scoped.isEnabled.mockReturnValue(enabled);
  securityService.accessControl.asScoped.mockReturnValue(scoped);
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const authorization = actionsAuthorizationMock.create();
  const actionTypeRegistry = {
    isSystemActionType: jest.fn().mockReturnValue(false),
    hasSubFeature: jest.fn((actionTypeId: string) => actionTypeId === '.sub-feature'),
    getActionKibanaPrivileges: jest.fn().mockReturnValue(['sub-feature-privilege']),
  };

  const context: ActionsClientContext = {
    logger: loggingSystemMock.createLogger(),
    kibanaIndices: ['.kibana'],
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
    unsecuredSavedObjectsClient,
    actionTypeRegistry: actionTypeRegistry as unknown as ActionTypeRegistry,
    authTypeRegistry: {} as AuthTypeRegistry,
    inMemoryConnectors: [],
    actionExecutor: actionExecutorMock.create(),
    request: httpServerMock.createKibanaRequest(),
    authorization: authorization as unknown as ActionsAuthorization,
    bulkExecutionEnqueuer: jest.fn(),
    connectorTokenClient: connectorTokenClientMock.create(),
    getEventLogClient: jest.fn(),
    getAxiosInstanceWithAuth: jest.fn(),
    isESOCanEncrypt: true,
    securityService,
  };

  return { context, securityService, scoped, unsecuredSavedObjectsClient, authorization };
};

const connector = (id: string, actionTypeId = '.webhook') => ({
  id,
  type: 'action',
  attributes: { actionTypeId },
  references: [],
  acl: ACL,
});

const expectUnusable = async (promise: Promise<void>, connectorId: string) => {
  const error = await promise.catch((e) => e);
  expect(Boom.isBoom(error) && error.output.statusCode).toBe(403);
  expect(error.data).toEqual({ connectorId });
};

describe('ensureConnectorsUsable', () => {
  it('passes when the credential can use every connector', async () => {
    const { context, scoped, unsecuredSavedObjectsClient, authorization } = createContext();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [connector('c1'), connector('c2', '.sub-feature')],
    });
    scoped.authorize.mockResolvedValue(
      new Map([
        ['c1', { status: 'allowed' }],
        ['c2', { status: 'allowed' }],
      ])
    );

    await ensureConnectorsUsable({ context, ids: ['c1', 'c2'] });

    expect(unsecuredSavedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: 'action', id: 'c1' },
      { type: 'action', id: 'c2' },
    ]);
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: 'execute',
      actionTypeId: '.webhook',
      additionalPrivileges: [],
    });
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: 'execute',
      actionTypeId: '.sub-feature',
      additionalPrivileges: ['sub-feature-privilege'],
    });
    expect(scoped.authorize).toHaveBeenCalledWith({
      type: 'action',
      spaceId: 'default',
      operation: 'use',
      objects: [
        { id: 'c1', acl: ACL },
        { id: 'c2', acl: ACL },
      ],
    });
  });

  it('vouches for the principal before the credential reads any connector', async () => {
    const { context, securityService, scoped, unsecuredSavedObjectsClient } = createContext();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [connector('c1')] });
    scoped.authorize.mockResolvedValue(new Map([['c1', { status: 'allowed' }]]));

    await ensureConnectorsUsable({ context, ids: ['c1'], principal: PRINCIPAL });

    expect(securityService.accessControl.asScoped).toHaveBeenCalledWith(context.request, {
      principal: PRINCIPAL,
    });
    expect(securityService.accessControl.asScoped.mock.invocationCallOrder[0]).toBeLessThan(
      unsecuredSavedObjectsClient.bulkGet.mock.invocationCallOrder[0]
    );
  });

  it('refuses a connector the credential cannot view', async () => {
    const { context, scoped, unsecuredSavedObjectsClient, authorization } = createContext();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        connector('c1'),
        { ...connector('hidden'), error: { statusCode: 404, error: 'Not Found', message: '' } },
      ],
    });

    await expectUnusable(ensureConnectorsUsable({ context, ids: ['c1', 'hidden'] }), 'hidden');
    expect(authorization.ensureAuthorized).not.toHaveBeenCalled();
    expect(scoped.authorize).not.toHaveBeenCalled();
  });

  it('refuses a connector whose type the credential cannot execute', async () => {
    const { context, scoped, unsecuredSavedObjectsClient, authorization } = createContext();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [connector('c1')] });
    authorization.ensureAuthorized.mockRejectedValue(Boom.forbidden('Unauthorized to execute'));

    await expectUnusable(ensureConnectorsUsable({ context, ids: ['c1'] }), 'c1');
    expect(scoped.authorize).not.toHaveBeenCalled();
  });

  it('rethrows a privilege check that fails for another reason', async () => {
    const { context, unsecuredSavedObjectsClient, authorization } = createContext();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [connector('c1')] });
    authorization.ensureAuthorized.mockRejectedValue(new Error('cluster unavailable'));

    await expect(ensureConnectorsUsable({ context, ids: ['c1'] })).rejects.toThrow(
      'cluster unavailable'
    );
  });

  it('refuses a connector the credential cannot use', async () => {
    const { context, scoped, unsecuredSavedObjectsClient } = createContext();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [connector('c1'), connector('c2')],
    });
    scoped.authorize.mockResolvedValue(
      new Map([
        ['c1', { status: 'allowed' }],
        ['c2', { status: 'forbidden', operation: 'use' }],
      ])
    );

    await expectUnusable(ensureConnectorsUsable({ context, ids: ['c1', 'c2'] }), 'c2');
  });

  it('does nothing while object-level security is disabled', async () => {
    const { context, unsecuredSavedObjectsClient, authorization } = createContext({
      enabled: false,
    });

    await ensureConnectorsUsable({ context, ids: ['c1'] });

    expect(unsecuredSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
    expect(authorization.ensureAuthorized).not.toHaveBeenCalled();
  });
});
