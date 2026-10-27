/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  MissingEntityIndexPrivilegeError,
  CustomResolutionRuleNotFoundError,
  EntityStoreNotInstalledError,
  InvalidCustomResolutionRuleError,
} from '../../../errors';
import { CustomResolutionRulesClient } from './client';
import { CustomResolutionRuleTypeName } from './constants';
import type { CustomResolutionRuleAttributes } from './saved_object';

jest.mock('../../../asset_manager/resolve_entity_store_indices', () => ({
  resolveLatestEntitiesIndexName: jest.fn().mockResolvedValue('.entities.v2.latest.default'),
}));

const LOCAL_USERS_TO_AD = {
  name: 'Endpoint local users to AD',
  namespaces: ['local', 'active_directory'],
  filter: 'NOT ENDS_WITH(user.name, "$")',
  match_value: 'TO_LOWER(user.name)',
};

const ATTRIBUTES: CustomResolutionRuleAttributes = {
  name: LOCAL_USERS_TO_AD.name,
  entityNamespaces: LOCAL_USERS_TO_AD.namespaces,
  filter: LOCAL_USERS_TO_AD.filter,
  matchValue: LOCAL_USERS_TO_AD.match_value,
  declineSameNamespaceDuplicates: true,
  enabled: false,
};

const savedObject = (id: string, attributes = ATTRIBUTES) => ({
  id,
  type: CustomResolutionRuleTypeName,
  attributes,
  references: [],
  version: 'WzEsMV0=',
  created_at: '2026-10-12T00:00:00.000Z',
  updated_at: '2026-10-12T00:00:00.000Z',
});

const esResponseError = (statusCode: number, reason: string) =>
  new esErrors.ResponseError({
    statusCode,
    body: { error: { type: 'verification_exception', reason } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const setup = () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockResolvedValue({ columns: [], values: [] } as never);
  esClient.indices.exists.mockResolvedValue(true as never);
  esClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: true } as never);
  soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });
  soClient.create.mockImplementation(async (_type, attributes) =>
    savedObject('new-id', attributes as CustomResolutionRuleAttributes)
  );
  const client = new CustomResolutionRulesClient({
    soClient,
    esClient,
    spaceId: 'default',
    logger: loggerMock.create(),
  });
  return { client, soClient, esClient };
};

describe('CustomResolutionRulesClient', () => {
  describe('create', () => {
    it('saves a validated rule, disabled by default, with the same-namespace check on', async () => {
      const { client, soClient, esClient } = setup();
      const rule = await client.create(LOCAL_USERS_TO_AD);

      expect(soClient.create).toHaveBeenCalledWith(CustomResolutionRuleTypeName, ATTRIBUTES, {
        refresh: 'wait_for',
      });
      expect(rule).toEqual({
        id: 'new-id',
        ...LOCAL_USERS_TO_AD,
        decline_same_namespace_duplicates: true,
        enabled: false,
        created_at: '2026-10-12T00:00:00.000Z',
        updated_at: '2026-10-12T00:00:00.000Z',
      });

      const [{ query }] = esClient.esql.query.mock.calls[0] as [{ query: string }];
      expect(query).not.toContain('unmapped_fields');
      expect(query).toContain('| LIMIT 0');
    });

    it('stores what the user wrote, not the re-printed expression', async () => {
      const { client, soClient } = setup();
      await client.create({ ...LOCAL_USERS_TO_AD, match_value: 'TO_LOWER(user.name) // key' });

      expect(soClient.create.mock.calls[0][1]).toMatchObject({
        matchValue: 'TO_LOWER(user.name) // key',
      });
    });

    it('rejects an expression that is not a single expression before touching Elasticsearch', async () => {
      const { client, soClient, esClient } = setup();
      await expect(
        client.create({ ...LOCAL_USERS_TO_AD, filter: 'true | DROP user.name' })
      ).rejects.toThrow("Invalid 'filter' in custom resolution rule");
      expect(esClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('turns an Elasticsearch verification error into a validation error', async () => {
      const { client, soClient, esClient } = setup();
      esClient.esql.query.mockRejectedValue(
        esResponseError(400, 'Found 1 problem\nline 3:9: Unknown column [user.nmae]')
      );

      await expect(
        client.create({ ...LOCAL_USERS_TO_AD, match_value: 'user.nmae' })
      ).rejects.toThrow(
        'Invalid custom resolution rule: Found 1 problem\nline 3:9: Unknown column [user.nmae]'
      );
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('reports a space without an entity store as not installed', async () => {
      const { client, esClient } = setup();
      esClient.indices.exists.mockResolvedValue(false as never);

      await expect(client.create(LOCAL_USERS_TO_AD)).rejects.toBeInstanceOf(
        EntityStoreNotInstalledError
      );
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('rethrows Elasticsearch errors that are not a bad request', async () => {
      const { client, esClient } = setup();
      esClient.esql.query.mockRejectedValue(esResponseError(503, 'no shards available'));

      const error = await client.create(LOCAL_USERS_TO_AD).catch((e) => e);
      expect(error).toBeInstanceOf(esErrors.ResponseError);
      expect(error).not.toBeInstanceOf(InvalidCustomResolutionRuleError);
    });

    it('rejects a key that Elasticsearch types as boolean', async () => {
      const { client, soClient, esClient } = setup();
      esClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'match_value', type: 'keyword' },
          { name: 'raw_match_value', type: 'boolean' },
        ],
        values: [],
      } as never);

      await expect(
        client.create({ ...LOCAL_USERS_TO_AD, match_value: 'user.domain IS NOT NULL' })
      ).rejects.toThrow("Invalid 'match_value' in custom resolution rule: must not be a boolean");
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('rejects a constant key before touching Elasticsearch', async () => {
      const { client, esClient } = setup();

      await expect(client.create({ ...LOCAL_USERS_TO_AD, match_value: '"x"' })).rejects.toThrow(
        'must read at least one field'
      );
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('lets a saved-objects authorization error through for the route to map', async () => {
      const { client, soClient } = setup();
      soClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('x'))
      );

      const error = await client.create(LOCAL_USERS_TO_AD).catch((e) => e);
      expect(SavedObjectsErrorHelpers.isForbiddenError(error)).toBe(true);
    });

    it('names the missing privilege when checking the index is forbidden', async () => {
      const { client, soClient, esClient } = setup();
      // A HEAD response carries no body, so Elasticsearch's message is empty.
      esClient.indices.exists.mockRejectedValue(
        new esErrors.ResponseError({
          statusCode: 403,
          body: '',
          headers: {},
          warnings: [],
          meta: {} as never,
        })
      );

      const error = await client.create(LOCAL_USERS_TO_AD).catch((e) => e);
      expect(error).toBeInstanceOf(MissingEntityIndexPrivilegeError);
      expect(error.message).toContain("'.entities.v2.latest.default'");
      expect(error.message).toContain("requires the 'view_index_metadata' index privilege");
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('creates a disabled rule without checking write access to the entity index', async () => {
      const { client, esClient } = setup();
      await client.create(LOCAL_USERS_TO_AD);

      expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('creates an enabled rule only for a user who can write links to the entity index', async () => {
      const { client, soClient, esClient } = setup();
      await client.create({ ...LOCAL_USERS_TO_AD, enabled: true });

      expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
        index: [{ names: ['.entities.v2.latest.default'], privileges: ['write'] }],
      });
      expect(soClient.create).toHaveBeenCalled();
    });

    it('refuses an enabled rule from a user who cannot write to the entity index', async () => {
      const { client, soClient, esClient } = setup();
      esClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: false } as never);

      await expect(client.create({ ...LOCAL_USERS_TO_AD, enabled: true })).rejects.toBeInstanceOf(
        MissingEntityIndexPrivilegeError
      );
      expect(soClient.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('renames a rule without re-validating, writing with the version it read', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockResolvedValue({ ...savedObject('a'), updated_at: 'later' } as never);

      const rule = await client.update('a', { name: 'renamed' });

      expect(esClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledWith(
        CustomResolutionRuleTypeName,
        'a',
        { ...ATTRIBUTES, name: 'renamed' },
        { refresh: 'wait_for', mergeAttributes: false, version: 'WzEsMV0=' }
      );
      expect(rule).toMatchObject({ id: 'a', name: 'renamed', updated_at: 'later' });
    });

    it('disables a rule without re-validating', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a', { ...ATTRIBUTES, enabled: true }));
      soClient.update.mockResolvedValue(savedObject('a') as never);

      await client.update('a', { enabled: false });

      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('validates when a disabled rule is turned on', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      esClient.esql.query.mockRejectedValue(esResponseError(400, 'Unknown column [user.name]'));

      await expect(client.update('a', { enabled: true })).rejects.toBeInstanceOf(
        InvalidCustomResolutionRuleError
      );
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('refuses to turn a rule on for a user who cannot write to the entity index', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      esClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: false } as never);

      await expect(client.update('a', { enabled: true })).rejects.toBeInstanceOf(
        MissingEntityIndexPrivilegeError
      );
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('refuses to change an enabled rule for a user who cannot write to the entity index', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a', { ...ATTRIBUTES, enabled: true }));
      esClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: false } as never);

      await expect(
        client.update('a', { match_value: 'TO_UPPER(user.name)' })
      ).rejects.toBeInstanceOf(MissingEntityIndexPrivilegeError);
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it.each([
      ['only the same-namespace check', { decline_same_namespace_duplicates: false }],
      ['removing the filter', { filter: null }],
    ])(
      'treats %s on an enabled rule as a definition change that needs write access',
      async (_case, patch) => {
        const { client, soClient, esClient } = setup();
        soClient.get.mockResolvedValue(savedObject('a', { ...ATTRIBUTES, enabled: true }));
        esClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: false } as never);

        await expect(client.update('a', patch)).rejects.toBeInstanceOf(
          MissingEntityIndexPrivilegeError
        );
        expect(soClient.update).not.toHaveBeenCalled();
      }
    );

    it('changes a disabled rule without checking write access to the entity index', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockResolvedValue(savedObject('a') as never);

      await client.update('a', { match_value: 'TO_UPPER(user.name)' });

      expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalled();
    });

    it('validates a changed definition', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      esClient.esql.query.mockRejectedValue(esResponseError(400, 'Unknown column [x]'));

      await expect(client.update('a', { match_value: 'x' })).rejects.toBeInstanceOf(
        InvalidCustomResolutionRuleError
      );
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('does not count reordered namespaces as a definition change', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockResolvedValue(savedObject('a') as never);

      await client.update('a', { namespaces: ['active_directory', 'local'] });

      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('removes the filter when it is set to null', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockResolvedValue(savedObject('a') as never);

      const rule = await client.update('a', { filter: null });

      expect(soClient.update.mock.calls[0][2]).not.toHaveProperty('filter');
      expect(rule).not.toHaveProperty('filter');
    });

    it('reports a rule deleted between the read and the write as not found', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(CustomResolutionRuleTypeName, 'a')
      );

      await expect(client.update('a', { name: 'renamed' })).rejects.toBeInstanceOf(
        CustomResolutionRuleNotFoundError
      );
    });

    it('lets a version conflict through for the route to map', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(CustomResolutionRuleTypeName, 'a')
      );

      const error = await client.update('a', { name: 'x' }).catch((e) => e);
      expect(SavedObjectsErrorHelpers.isConflictError(error)).toBe(true);
    });

    it('reports a missing rule as not found', async () => {
      const { client, soClient } = setup();
      soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(client.update('missing', { enabled: true })).rejects.toBeInstanceOf(
        CustomResolutionRuleNotFoundError
      );
    });
  });

  describe('preview', () => {
    it('turns an Elasticsearch verification error into a validation error', async () => {
      const { client, esClient } = setup();
      esClient.esql.query.mockRejectedValue(esResponseError(400, 'Unknown column [user.nmae]'));

      const error = await client
        .preview({ ...LOCAL_USERS_TO_AD, match_value: 'TO_LOWER(user.nmae)' })
        .catch((e) => e);
      expect(error).toBeInstanceOf(InvalidCustomResolutionRuleError);
      expect(error.message).toContain('Unknown column [user.nmae]');
    });

    it('turns a bad request from the scan itself into a validation error', async () => {
      const { client, esClient } = setup();
      esClient.esql.query
        .mockResolvedValueOnce({ columns: [], values: [] } as never)
        .mockRejectedValueOnce(esResponseError(400, 'scan failed'));

      await expect(client.preview(LOCAL_USERS_TO_AD)).rejects.toBeInstanceOf(
        InvalidCustomResolutionRuleError
      );
    });
  });

  describe('delete', () => {
    it('reports a missing rule as not found', async () => {
      const { client, soClient } = setup();
      soClient.delete.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(client.delete('missing')).rejects.toBeInstanceOf(
        CustomResolutionRuleNotFoundError
      );
    });
  });

  describe('list', () => {
    it('returns rules oldest first', async () => {
      const { client, soClient } = setup();
      soClient.find.mockResolvedValue({
        saved_objects: [
          { ...savedObject('newer'), created_at: '2026-10-12T02:00:00.000Z' },
          { ...savedObject('older'), created_at: '2026-10-12T01:00:00.000Z' },
        ],
        total: 2,
        per_page: 100,
        page: 1,
      } as never);

      expect((await client.list()).map(({ id }) => id)).toEqual(['older', 'newer']);
    });

    it('returns every rule, not only the first page', async () => {
      const { client, soClient } = setup();
      const page = (ids: string[]) =>
        ({
          saved_objects: ids.map((id) => savedObject(id)),
          total: 101,
          per_page: 100,
          page: 1,
        }) as never;
      soClient.find
        .mockResolvedValueOnce(page(Array.from({ length: 100 }, (_, i) => `r${i}`)))
        .mockResolvedValueOnce(page(['r100']));

      expect(await client.list()).toHaveLength(101);
      expect(soClient.createPointInTimeFinder.mock.results[0].value.close).toHaveBeenCalled();
    });
  });
});
