/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CanonicalAcl } from '@kbn/access-control';
import type { SavedObject } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsRepositoryMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';

import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import type { InMemoryConnector, RawAction } from '../../../../types';
import { resolveConnectorName } from './resolve_connector_name';

const PRIVATE_ACL: CanonicalAcl = {
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general_access: ['none'],
  entries: [],
};
const PUBLIC_ACL: CanonicalAcl = { ...PRIVATE_ACL, general_access: ['edit'] };
const INVALID_ACL: CanonicalAcl = { ...PUBLIC_ACL, version: [] };

const savedConnector = (id: string, name: string, acl?: CanonicalAcl): SavedObject<RawAction> => ({
  id,
  type: 'action',
  references: [],
  attributes: { name } as RawAction,
  ...(acl && { acl }),
});

const inMemoryConnector = (overrides: Partial<InMemoryConnector> = {}): InMemoryConnector => ({
  id: 'preconfigured-slack',
  actionTypeId: '.slack',
  name: 'Slack',
  isPreconfigured: true,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  config: {},
  secrets: {},
  ...overrides,
});

const createContext = ({
  savedObjects = [],
  inMemoryConnectors = [],
  enabled = true,
  spaceId,
}: {
  savedObjects?: Array<SavedObject<RawAction>>;
  inMemoryConnectors?: InMemoryConnector[];
  enabled?: boolean;
  spaceId?: string;
} = {}) => {
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  internalSavedObjectsRepository.find.mockResolvedValue({
    saved_objects: savedObjects.map((savedObject) => ({ ...savedObject, score: 1 })),
    total: savedObjects.length,
    per_page: 10000,
    page: 1,
  });

  const securityService = securityServiceMock.createStart();
  const scoped = securityServiceMock.createScopedAccessControl();
  securityService.accessControl.asScoped.mockReturnValue(scoped);
  scoped.isEnabled.mockReturnValue(enabled);

  const authorization = actionsAuthorizationMock.create();
  return {
    context: {
      authorization: authorization as unknown as ActionsAuthorization,
      inMemoryConnectors,
      internalSavedObjectsRepository,
      request: httpServerMock.createKibanaRequest(),
      scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
      securityService,
      spaceId,
      spaces: { getSpaceId: jest.fn().mockReturnValue('request-space') },
    },
    authorization,
    internalSavedObjectsRepository,
    scoped,
  };
};

const AMBIGUOUS_NAME_ERROR =
  'Connector name "Slack" matches more than one connector; use the connector ID';

describe('resolveConnectorName', () => {
  it('reads candidates in the resolved space through the internal repository', async () => {
    const { context, internalSavedObjectsRepository } = createContext({ spaceId: 'other-space' });

    await resolveConnectorName({ context, name: 'Team "ops" \\ Slack' });

    expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
      type: 'action',
      search: '"Team \\"ops\\" \\\\ Slack"',
      searchFields: ['name'],
      fields: ['name'],
      namespaces: ['other-space'],
      perPage: 10000,
    });
  });

  it('uses the request space when no space overrides it', async () => {
    const { context, internalSavedObjectsRepository } = createContext();

    await resolveConnectorName({ context, name: 'Slack' });

    expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ namespaces: ['request-space'] })
    );
  });

  it('returns nothing when no connector has exactly that name', async () => {
    const { context } = createContext({
      savedObjects: [savedConnector('c1', 'Slack prod')],
      inMemoryConnectors: [inMemoryConnector({ name: 'Slack dev' })],
    });

    await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBeUndefined();
  });

  it('checks the connector read privilege before any read', async () => {
    const { context, authorization, internalSavedObjectsRepository } = createContext();
    authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to get actions'));

    await expect(resolveConnectorName({ context, name: 'Slack' })).rejects.toThrow(
      'Unauthorized to get actions'
    );
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    expect(internalSavedObjectsRepository.find).not.toHaveBeenCalled();
  });

  describe('with a single candidate', () => {
    it('resolves a restricted connector the caller can view', async () => {
      const { context, scoped } = createContext({
        spaceId: 'other-space',
        savedObjects: [savedConnector('private', 'Slack', PRIVATE_ACL)],
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBe('private');
      expect(scoped.filterVisible).toHaveBeenCalledWith({
        type: 'action',
        spaceId: 'other-space',
        objects: [{ id: 'private', acl: PRIVATE_ACL }],
      });
    });

    it('reports a restricted connector the caller cannot view as missing', async () => {
      const { context, scoped } = createContext({
        savedObjects: [savedConnector('private', 'Slack', PRIVATE_ACL)],
      });
      scoped.filterVisible.mockResolvedValue([]);

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBeUndefined();
    });

    it('decides nothing while object-level security is disabled', async () => {
      const { context, scoped } = createContext({
        enabled: false,
        savedObjects: [savedConnector('private', 'Slack', PRIVATE_ACL)],
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBe('private');
      expect(scoped.filterVisible).not.toHaveBeenCalled();
    });
  });

  describe('with duplicate names', () => {
    it.each([
      ['a restricted saved connector', [savedConnector('private', 'Slack', PRIVATE_ACL)], []],
      ['a connector with a damaged ACL', [savedConnector('damaged', 'Slack', INVALID_ACL)], []],
      [
        'a restricted saved connector next to an in-memory one',
        [savedConnector('private', 'Slack', PRIVATE_ACL)],
        [inMemoryConnector()],
      ],
    ])('fails with %s among the candidates', async (_, restricted, inMemoryConnectors) => {
      const { context } = createContext({
        savedObjects: [savedConnector('public', 'Slack'), ...restricted],
        inMemoryConnectors,
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).rejects.toThrow(
        AMBIGUOUS_NAME_ERROR
      );
    });

    it('fails the same way whatever the caller can view', async () => {
      const savedObjects = [
        savedConnector('public', 'Slack', PUBLIC_ACL),
        savedConnector('private', 'Slack', PRIVATE_ACL),
      ];
      const owner = createContext({ savedObjects });
      owner.scoped.getPrincipal.mockResolvedValue({ type: 'user', id: 'u_owner' });
      const stranger = createContext({ savedObjects });
      stranger.scoped.getPrincipal.mockResolvedValue({ type: 'user', id: 'u_stranger' });
      stranger.scoped.filterVisible.mockResolvedValue([]);
      const serviceAccount = createContext({ savedObjects });
      serviceAccount.scoped.getPrincipal.mockResolvedValue({
        type: 'service_account',
        id: 'workflow/sa',
      });

      for (const { context, scoped } of [owner, stranger, serviceAccount]) {
        await expect(resolveConnectorName({ context, name: 'Slack' })).rejects.toThrow(
          AMBIGUOUS_NAME_ERROR
        );
        expect(scoped.getPrincipal).not.toHaveBeenCalled();
        expect(scoped.authorize).not.toHaveBeenCalled();
        expect(scoped.filterVisible).not.toHaveBeenCalled();
      }
    });

    it('keeps the first match when every candidate is unrestricted', async () => {
      const { context } = createContext({
        savedObjects: [
          savedConnector('first', 'Slack'),
          savedConnector('prod', 'Slack prod'),
          savedConnector('second', 'Slack', PUBLIC_ACL),
        ],
        inMemoryConnectors: [inMemoryConnector()],
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBe('first');
    });

    it('lists in-memory connectors after saved ones', async () => {
      const { context } = createContext({
        savedObjects: [savedConnector('saved', 'Slack')],
        inMemoryConnectors: [inMemoryConnector()],
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBe('saved');
    });

    it('keeps the first match while object-level security is disabled', async () => {
      const { context } = createContext({
        enabled: false,
        savedObjects: [
          savedConnector('private', 'Slack', PRIVATE_ACL),
          savedConnector('public', 'Slack'),
        ],
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBe('private');
    });
  });

  describe('in-memory connectors', () => {
    it('resolves an in-memory connector by name', async () => {
      const { context } = createContext({ inMemoryConnectors: [inMemoryConnector()] });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBe(
        'preconfigured-slack'
      );
    });

    it('leaves out system connectors, as listing connectors does', async () => {
      const { context } = createContext({
        inMemoryConnectors: [inMemoryConnector({ id: 'system-slack', isSystemAction: true })],
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBeUndefined();
    });

    it('leaves out inference connectors without an endpoint, as listing connectors does', async () => {
      const { context } = createContext({
        inMemoryConnectors: [
          inMemoryConnector({
            id: 'inference',
            actionTypeId: '.inference',
            config: { inferenceId: 'missing' },
          }),
        ],
      });
      context.scopedClusterClient.asInternalUser.inference.get.mockResolvedValue({
        endpoints: [],
      });

      await expect(resolveConnectorName({ context, name: 'Slack' })).resolves.toBeUndefined();
    });
  });
});
