/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CanonicalAcl } from '@kbn/access-control';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import type { SpaceId } from '@kbn/core-spaces-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import type { ActionsClientContext } from '../../../../actions_client';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import type { AuthTypeRegistry } from '../../../../auth_types/auth_type_registry';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { createMockInMemoryConnector } from '../../mocks';
import { getRestrictedConnectorIds } from './get_restricted_connector_ids';

const PRIVATE_ACL: CanonicalAcl = {
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general_access: ['none'],
  entries: [],
};
const PUBLIC_ACL: CanonicalAcl = { ...PRIVATE_ACL, general_access: ['use'] };

const createContext = ({
  enabled = true,
  spaceId,
}: { enabled?: boolean; spaceId?: string } = {}) => {
  const securityService = securityServiceMock.createStart();
  const scoped = securityServiceMock.createScopedAccessControl();
  scoped.isEnabled.mockReturnValue(enabled);
  securityService.accessControl.asScoped.mockReturnValue(scoped);
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

  const context: ActionsClientContext = {
    logger: loggingSystemMock.createLogger(),
    kibanaIndices: ['.kibana'],
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
    unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
    actionTypeRegistry: {} as ActionTypeRegistry,
    authTypeRegistry: {} as AuthTypeRegistry,
    inMemoryConnectors: [createMockInMemoryConnector({ id: 'preconfigured' })],
    actionExecutor: actionExecutorMock.create(),
    request: httpServerMock.createKibanaRequest(),
    spaceId: spaceId as SpaceId | undefined,
    authorization: actionsAuthorizationMock.create() as unknown as ActionsAuthorization,
    bulkExecutionEnqueuer: jest.fn(),
    connectorTokenClient: connectorTokenClientMock.create(),
    getEventLogClient: jest.fn(),
    getAxiosInstanceWithAuth: jest.fn(),
    isESOCanEncrypt: true,
    securityService,
    internalSavedObjectsRepository,
  };

  return { context, internalSavedObjectsRepository };
};

const connector = (id: string, acl?: CanonicalAcl) => ({
  id,
  type: 'action',
  attributes: {},
  references: [],
  ...(acl ? { acl } : {}),
});

describe('getRestrictedConnectorIds', () => {
  it('returns the connectors whose general access does not permit use', async () => {
    const { context, internalSavedObjectsRepository } = createContext();
    internalSavedObjectsRepository.bulkGet.mockResolvedValue({
      saved_objects: [connector('private', PRIVATE_ACL), connector('public', PUBLIC_ACL)],
    });

    await expect(
      getRestrictedConnectorIds({ context, ids: ['private', 'public', 'private'] })
    ).resolves.toEqual(['private']);
    expect(internalSavedObjectsRepository.bulkGet).toHaveBeenCalledWith(
      [
        { type: 'action', id: 'private' },
        { type: 'action', id: 'public' },
      ],
      { namespace: undefined }
    );
  });

  it('treats a connector without an ACL as unrestricted', async () => {
    const { context, internalSavedObjectsRepository } = createContext();
    internalSavedObjectsRepository.bulkGet.mockResolvedValue({
      saved_objects: [connector('legacy')],
    });

    await expect(getRestrictedConnectorIds({ context, ids: ['legacy'] })).resolves.toEqual([]);
  });

  it('reads connectors in the connector space', async () => {
    const { context, internalSavedObjectsRepository } = createContext({ spaceId: 'other' });
    internalSavedObjectsRepository.bulkGet.mockResolvedValue({ saved_objects: [] });

    await getRestrictedConnectorIds({ context, ids: ['c1'] });

    expect(internalSavedObjectsRepository.bulkGet).toHaveBeenCalledWith(expect.any(Array), {
      namespace: 'other',
    });
  });

  it('treats only a missing connector as unrestricted', async () => {
    const { context, internalSavedObjectsRepository } = createContext();
    internalSavedObjectsRepository.bulkGet.mockResolvedValue({
      saved_objects: [
        { ...connector('missing'), error: { statusCode: 404, error: 'Not Found', message: '' } },
        { ...connector('broken'), error: { statusCode: 500, error: 'Error', message: '' } },
      ],
    });

    await expect(
      getRestrictedConnectorIds({ context, ids: ['missing', 'broken'] })
    ).resolves.toEqual(['broken']);
  });

  it('makes no request for in-memory connectors', async () => {
    const { context, internalSavedObjectsRepository } = createContext();

    await expect(getRestrictedConnectorIds({ context, ids: ['preconfigured'] })).resolves.toEqual(
      []
    );
    expect(internalSavedObjectsRepository.bulkGet).not.toHaveBeenCalled();
  });

  it('makes no request while object-level security is disabled', async () => {
    const { context, internalSavedObjectsRepository } = createContext({ enabled: false });

    await expect(getRestrictedConnectorIds({ context, ids: ['c1'] })).resolves.toEqual([]);
    expect(internalSavedObjectsRepository.bulkGet).not.toHaveBeenCalled();
  });

  it('fails closed without the internal repository', async () => {
    const { context } = createContext();

    await expect(
      getRestrictedConnectorIds({
        context: { ...context, internalSavedObjectsRepository: undefined },
        ids: ['c1'],
      })
    ).rejects.toThrow('Connector access cannot be classified without the internal repository');
  });
});
