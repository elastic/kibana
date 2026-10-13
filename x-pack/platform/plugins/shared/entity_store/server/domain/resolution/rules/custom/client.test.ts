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
  CustomResolutionRuleNotFoundError,
  InvalidCustomResolutionRuleError,
} from '../../../errors';
import { CustomResolutionRulesClient } from './client';
import { MAX_CUSTOM_RULES_PER_SPACE } from './constants';
import { CustomResolutionRuleTypeName, type CustomResolutionRuleAttributes } from './saved_object';

jest.mock('../../../asset_manager/resolve_entity_store_indices', () => ({
  resolveLatestEntitiesIndexName: jest.fn().mockResolvedValue('.entities.v2.latest.default'),
}));

const ELEVANCE = {
  name: 'CrowdStrike local users to AD',
  namespaces: ['local', 'active_directory'],
  filter: 'NOT ENDS_WITH(user.name, "$")',
  match_value: 'TO_LOWER(user.name)',
};

const ATTRIBUTES: CustomResolutionRuleAttributes = {
  name: ELEVANCE.name,
  namespaces: ELEVANCE.namespaces,
  filter: ELEVANCE.filter,
  matchValue: ELEVANCE.match_value,
  declineSameNamespaceDuplicates: true,
  enabled: false,
};

const savedObject = (id: string, attributes = ATTRIBUTES) => ({
  id,
  type: CustomResolutionRuleTypeName,
  attributes,
  references: [],
  created_at: '2026-10-12T00:00:00.000Z',
  updated_at: '2026-10-12T00:00:00.000Z',
});

const esqlBadRequest = (reason: string) =>
  new esErrors.ResponseError({
    statusCode: 400,
    body: { error: { type: 'verification_exception', reason } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const setup = () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockResolvedValue({ columns: [], values: [] } as never);
  soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });
  soClient.create.mockImplementation(async (_type, attributes) =>
    savedObject('new-id', attributes as CustomResolutionRuleAttributes)
  );
  const client = new CustomResolutionRulesClient({
    soClient,
    esClient,
    namespace: 'default',
    logger: loggerMock.create(),
  });
  return { client, soClient, esClient };
};

describe('CustomResolutionRulesClient', () => {
  describe('create', () => {
    it('saves a validated rule, disabled by default, with the same-namespace check on', async () => {
      const { client, soClient, esClient } = setup();
      const rule = await client.create(ELEVANCE);

      expect(soClient.create).toHaveBeenCalledWith(CustomResolutionRuleTypeName, ATTRIBUTES, {
        refresh: 'wait_for',
      });
      expect(rule).toEqual({
        id: 'new-id',
        ...ELEVANCE,
        decline_same_namespace_duplicates: true,
        enabled: false,
        created_at: '2026-10-12T00:00:00.000Z',
        updated_at: '2026-10-12T00:00:00.000Z',
      });

      const [{ query }] = esClient.esql.query.mock.calls[0] as [{ query: string }];
      expect(query).not.toContain('unmapped_fields');
      expect(query).toContain('| LIMIT 0');
    });

    it('stores what the user wrote, not the normalized expression', async () => {
      const { client, soClient } = setup();
      await client.create({ ...ELEVANCE, match_value: 'TO_LOWER(user.name) // key' });

      expect(soClient.create.mock.calls[0][1]).toMatchObject({
        matchValue: 'TO_LOWER(user.name) // key',
      });
    });

    it('rejects an expression that is not a single expression before touching Elasticsearch', async () => {
      const { client, soClient, esClient } = setup();
      await expect(
        client.create({ ...ELEVANCE, filter: 'true | DROP user.name' })
      ).rejects.toBeInstanceOf(InvalidCustomResolutionRuleError);
      expect(esClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('turns an Elasticsearch verification error into a validation error', async () => {
      const { client, soClient, esClient } = setup();
      esClient.esql.query.mockRejectedValue(
        esqlBadRequest('Found 1 problem\nline 3:9: Unknown column [user.nmae]')
      );

      await expect(client.create({ ...ELEVANCE, match_value: 'user.nmae' })).rejects.toThrow(
        'Unknown column [user.nmae]'
      );
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('rethrows Elasticsearch errors that are not about the rule', async () => {
      const { client, esClient } = setup();
      esClient.esql.query.mockRejectedValue(new Error('connection reset'));

      await expect(client.create(ELEVANCE)).rejects.toThrow('connection reset');
    });

    it(`refuses more than ${MAX_CUSTOM_RULES_PER_SPACE} rules per space`, async () => {
      const { client, soClient } = setup();
      soClient.find.mockResolvedValue({
        saved_objects: Array.from({ length: MAX_CUSTOM_RULES_PER_SPACE }, (_, i) =>
          savedObject(`r${i}`)
        ),
        total: MAX_CUSTOM_RULES_PER_SPACE,
        per_page: 100,
        page: 1,
      } as never);

      await expect(client.create(ELEVANCE)).rejects.toBeInstanceOf(
        InvalidCustomResolutionRuleError
      );
      expect(soClient.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('enables a rule without re-validating an unchanged definition', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockResolvedValue({ ...savedObject('a'), updated_at: 'later' } as never);

      const rule = await client.update('a', { enabled: true });

      expect(esClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledWith(
        CustomResolutionRuleTypeName,
        'a',
        { ...ATTRIBUTES, enabled: true },
        { refresh: 'wait_for', mergeAttributes: false }
      );
      expect(rule).toMatchObject({ id: 'a', enabled: true, updated_at: 'later' });
    });

    it('validates a changed definition', async () => {
      const { client, soClient, esClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      esClient.esql.query.mockRejectedValue(esqlBadRequest('Unknown column [x]'));

      await expect(client.update('a', { match_value: 'x' })).rejects.toBeInstanceOf(
        InvalidCustomResolutionRuleError
      );
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('removes the filter when it is set to null', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(savedObject('a'));
      soClient.update.mockResolvedValue(savedObject('a') as never);

      const rule = await client.update('a', { filter: null });

      expect(soClient.update.mock.calls[0][2]).not.toHaveProperty('filter');
      expect(rule).not.toHaveProperty('filter');
    });

    it('reports a missing rule as not found', async () => {
      const { client, soClient } = setup();
      soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(client.update('missing', { enabled: true })).rejects.toBeInstanceOf(
        CustomResolutionRuleNotFoundError
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
  });
});
