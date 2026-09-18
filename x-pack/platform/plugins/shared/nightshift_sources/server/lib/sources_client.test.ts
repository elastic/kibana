/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { escapeKuery } from '@kbn/es-query';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_SOURCE_SO_TYPE,
  type NightshiftSourceAttributes,
} from '../saved_objects/nightshift_source_saved_object';
import { createEsResponseError } from './es_errors.mock';
import { SourcesClient, type SourceViewsClient } from './sources_client';

const FULL_UPDATE = { mergeAttributes: false };

const unknownIndexError = () =>
  createEsResponseError(
    400,
    'verification_exception',
    'Found 1 problem\nline 1:6: Unknown index [logs-none]'
  );

const unknownColumnError = () =>
  createEsResponseError(
    400,
    'verification_exception',
    'Found 1 problem\nline 1:46: Unknown column [status]'
  );

const withColumns = { columns: [{ name: 'status', type: 'integer' }], values: [] };
// What ES returns for a wildcard that matches no index: one placeholder column.
const withoutColumns = { columns: [{ name: '<no-fields>', type: 'null' }], values: [] };

const makeAttributes = (
  overrides: Partial<NightshiftSourceAttributes> = {}
): NightshiftSourceAttributes => ({
  title: 'nginx errors',
  description: undefined,
  tags: ['nginx'],
  esql: 'FROM logs-nginx-* | WHERE status >= 500',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const makeSavedObject = (
  attributes = makeAttributes(),
  id = 'source-1'
): SavedObject<NightshiftSourceAttributes> => ({
  id,
  type: NIGHTSHIFT_SOURCE_SO_TYPE,
  references: [],
  attributes,
});

const makeSource = (overrides: Partial<NightshiftSource> = {}): NightshiftSource => ({
  id: 'source-1',
  ...makeAttributes(),
  ...overrides,
});

const emptyCatalogFind = {
  saved_objects: [],
  total: 0,
  page: 1,
  per_page: 1,
};

const setup = () => {
  const soClient = savedObjectsClientMock.create();
  const catalogSoClient = savedObjectsClientMock.create();
  const dataEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const viewsClient: jest.Mocked<SourceViewsClient> = {
    putView: jest.fn().mockResolvedValue(undefined),
    getView: jest.fn().mockResolvedValue(undefined),
    deleteView: jest.fn().mockResolvedValue(undefined),
  };
  const logger = loggingSystemMock.createLogger();

  const client = new SourcesClient({
    soClient,
    catalogSoClient,
    viewsClient,
    dataEsClient,
    logger,
    username: 'marco',
  });

  catalogSoClient.find.mockResolvedValue(emptyCatalogFind);
  dataEsClient.esql.query.mockResponse(withColumns);

  return { client, soClient, catalogSoClient, viewsClient, dataEsClient, logger };
};

describe('SourcesClient', () => {
  describe('getHealth', () => {
    it('is unknown when the view cannot be read', async () => {
      const { client, viewsClient } = setup();
      viewsClient.getView.mockRejectedValue(forbidden('no read_view_metadata'));

      await expect(client.getHealth(makeSource())).resolves.toBe('unknown');
    });

    it('is view_missing when the view does not exist', async () => {
      const { client, viewsClient } = setup();
      viewsClient.getView.mockResolvedValue(undefined);

      await expect(client.getHealth(makeSource())).resolves.toBe('view_missing');
    });

    it('is view_drift when the view query differs beyond formatting', async () => {
      const { client, viewsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: '$.nightshift.sources.nginx-errors',
        query: 'FROM logs-nginx-* | WHERE status >= 400',
      });

      await expect(client.getHealth(makeSource())).resolves.toBe('view_drift');
    });

    it('treats formatting-only differences as matching', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: '$.nightshift.sources.nginx-errors',
        query: 'from   logs-nginx-*\n| where status>=500',
      });

      await expect(client.getHealth(makeSource())).resolves.toBe('ok');
      expect(dataEsClient.esql.query).toHaveBeenCalledWith({
        query: 'FROM $.nightshift.sources.nginx-errors | LIMIT 0',
        format: 'json',
      });
    });

    it('is ok when the probe hits a pattern with no indices yet', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: '$.nightshift.sources.nginx-errors',
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query.mockRejectedValue(unknownIndexError());

      await expect(client.getHealth(makeSource())).resolves.toBe('ok');
    });

    it('is unresolvable when Unknown index comes from a multi-source query', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      const source = makeSource({
        esql: 'FROM logs-nginx-*, logs-none | WHERE status >= 500',
      });
      viewsClient.getView.mockResolvedValue({
        name: source.view_name,
        query: source.esql,
      });
      dataEsClient.esql.query.mockRejectedValue(unknownIndexError());

      await expect(client.getHealth(source)).resolves.toBe('unresolvable');
    });

    it('is unresolvable when the view no longer plans against existing indices', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: '$.nightshift.sources.nginx-errors',
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withColumns);

      await expect(client.getHealth(makeSource())).resolves.toBe('unresolvable');
      expect(dataEsClient.esql.query).toHaveBeenLastCalledWith({
        query: 'FROM logs-nginx-*\n| LIMIT 0',
        format: 'json',
      });
    });

    it('is ok when the view cannot resolve columns because nothing exists behind it yet', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: '$.nightshift.sources.nginx-errors',
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withoutColumns);

      await expect(client.getHealth(makeSource())).resolves.toBe('ok');
    });

    it('is unknown when the probe is forbidden', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: '$.nightshift.sources.nginx-errors',
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query.mockRejectedValue(
        createEsResponseError(403, 'security_exception', 'unauthorized')
      );

      await expect(client.getHealth(makeSource())).resolves.toBe('unknown');
    });

    it('is unknown when the follow-up source probe fails for a non-verification reason', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: '$.nightshift.sources.nginx-errors',
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockRejectedValueOnce(createEsResponseError(503, 'unavailable', 'shards down'));

      await expect(client.getHealth(makeSource())).resolves.toBe('unknown');
    });
  });

  describe('create', () => {
    it('validates, writes the saved object with a generated view name, then puts the view', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      const source = await client.create({
        title: 'nginx errors',
        tags: ['nginx'],
        esql: 'FROM logs-nginx-* | WHERE status >= 500',
      });

      expect(dataEsClient.esql.query).toHaveBeenCalledWith({
        query: 'FROM logs-nginx-* | WHERE status >= 500\n| LIMIT 0',
        format: 'json',
      });
      expect(source.slug).toBe('nginx-errors');
      expect(source.view_name).toBe('$.nightshift.sources.nginx-errors');
      expect(source.enabled).toBe(true);
      expect(source.created_by).toBe('marco');
      expect(source.esql_updated_at).toBe(source.created_at);
      expect(soClient.create).toHaveBeenCalledWith(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        expect.objectContaining({ view_name: source.view_name }),
        { id: source.id }
      );
      expect(viewsClient.putView).toHaveBeenCalledWith(
        source.view_name,
        'FROM logs-nginx-* | WHERE status >= 500'
      );
    });

    it('looks up the view name across every space before writing', async () => {
      const { client, catalogSoClient } = setup();

      await client.create({
        title: 'nginx errors',
        tags: [],
        esql: 'FROM logs-*',
      });

      expect(catalogSoClient.find).toHaveBeenCalledWith({
        type: NIGHTSHIFT_SOURCE_SO_TYPE,
        perPage: 1,
        namespaces: ['*'],
        filter: 'nightshift-source.attributes.view_name: "$.nightshift.sources.nginx-errors"',
      });
    });

    it('appends -2 when the catalog already has that view name', async () => {
      const { client, catalogSoClient, viewsClient } = setup();
      catalogSoClient.find
        .mockResolvedValueOnce({
          ...emptyCatalogFind,
          total: 1,
          saved_objects: [{ ...makeSavedObject(), score: 0 }],
        })
        .mockResolvedValueOnce(emptyCatalogFind);

      const source = await client.create({
        title: 'nginx errors',
        tags: [],
        esql: 'FROM logs-*',
      });

      expect(source.slug).toBe('nginx-errors-2');
      expect(source.view_name).toBe('$.nightshift.sources.nginx-errors-2');
      expect(viewsClient.putView).toHaveBeenCalledWith(
        '$.nightshift.sources.nginx-errors-2',
        'FROM logs-*'
      );
    });

    it('appends -2 when an orphaned view already uses that name', async () => {
      const { client, viewsClient } = setup();
      viewsClient.getView
        .mockResolvedValueOnce({ name: '$.nightshift.sources.nginx-errors', query: 'FROM logs-*' })
        .mockResolvedValueOnce(undefined);

      const source = await client.create({
        title: 'nginx errors',
        tags: [],
        esql: 'FROM logs-*',
      });

      expect(source.slug).toBe('nginx-errors-2');
      expect(source.view_name).toBe('$.nightshift.sources.nginx-errors-2');
    });

    it('rejects a blank title before touching saved objects or ES', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(
        client.create({ title: '   ', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects an invalid query before touching saved objects or ES', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-* | STATS c = COUNT(*)' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a Nightshift source view before touching saved objects or ES', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM $.nightshift.sources.*' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a $ wildcard that would match Nightshift source views', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(client.create({ title: 't', tags: [], esql: 'FROM $.*' })).rejects.toMatchObject(
        { output: { statusCode: 400 } }
      );
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('accepts a concrete index that does not exist yet', async () => {
      const { client, dataEsClient } = setup();
      dataEsClient.esql.query.mockRejectedValue(unknownIndexError());

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-none' })
      ).resolves.toBeDefined();
    });

    it('does not treat Unknown index as empty when FROM names several sources', async () => {
      const { client, soClient, dataEsClient } = setup();
      dataEsClient.esql.query.mockRejectedValue(unknownIndexError());

      await expect(
        client.create({
          title: 't',
          tags: [],
          esql: 'FROM logs-nginx-*, logs-none | WHERE status >= 500',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(soClient.create).not.toHaveBeenCalled();
    });

    // A wildcard matching nothing resolves to an empty relation, so ES reports the WHERE field
    // as an unknown column instead of an unknown index.
    it('accepts a wildcard that matches no index yet even when WHERE references fields', async () => {
      const { client, dataEsClient } = setup();
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withoutColumns);

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-none-* | WHERE status >= 500' })
      ).resolves.toBeDefined();
      expect(dataEsClient.esql.query).toHaveBeenNthCalledWith(2, {
        query: 'FROM logs-none-*\n| LIMIT 0',
        format: 'json',
      });
    });

    it('surfaces an unknown field on an existing index as a 400', async () => {
      const { client, soClient, dataEsClient } = setup();
      dataEsClient.esql.query
        .mockRejectedValueOnce(
          createEsResponseError(400, 'verification_exception', 'Unknown column [nope]')
        )
        .mockResponseOnce(withColumns);

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-* | WHERE nope > 1' })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('Unknown column [nope]'),
      });
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('surfaces a non-verification ES failure with its own status', async () => {
      const { client, soClient, dataEsClient } = setup();
      dataEsClient.esql.query.mockRejectedValue(
        createEsResponseError(403, 'security_exception', 'unauthorized for user [x]')
      );

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-* | WHERE x > 1' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(dataEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('rolls the saved object back when the view cannot be created', async () => {
      const { client, soClient, viewsClient } = setup();
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(viewsClient.deleteView).toHaveBeenCalledWith('$.nightshift.sources.t');
      expect(soClient.delete).toHaveBeenCalledWith(NIGHTSHIFT_SOURCE_SO_TYPE, expect.any(String));
    });

    it('keeps the saved object when the failed create cannot delete its view', async () => {
      const { client, soClient, viewsClient } = setup();
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));
      viewsClient.deleteView.mockRejectedValue(forbidden('no delete_view'));

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(viewsClient.deleteView).toHaveBeenCalledWith('$.nightshift.sources.t');
      expect(soClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rejects a disallowed command without writing', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await expect(
        client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-* | STATS c = COUNT(*)',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a Nightshift source view without writing', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await expect(
        client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM $.nightshift.sources.abc',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a $ wildcard that would match Nightshift source views without writing', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await expect(
        client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM $.nightshift.*',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects an unresolvable field without writing', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withColumns);

      await expect(
        client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-* | WHERE nope > 1',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('bumps esql_updated_at only when the normalized query changes', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const titleOnly = await client.update('source-1', {
        title: 'renamed',
        tags: ['nginx'],
        esql: 'from logs-nginx-*   | where status >= 500',
      });
      expect(titleOnly.title).toBe('renamed');
      expect(titleOnly.esql_updated_at).toBe('2026-09-01T00:00:00.000Z');
      expect(titleOnly.updated_at).not.toBe('2026-09-01T00:00:00.000Z');

      const queryChange = await client.update('source-1', {
        title: 'renamed',
        tags: ['nginx'],
        esql: 'FROM logs-nginx-* | WHERE status >= 400',
      });
      expect(queryChange.esql_updated_at).not.toBe('2026-09-01T00:00:00.000Z');
    });

    it('moves esql_updated_at forward when the clock does not', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
      try {
        const { client, soClient } = setup();
        soClient.get.mockResolvedValue(makeSavedObject());

        const sameMs = await client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-nginx-* | WHERE status >= 400',
        });
        expect(sameMs.esql_updated_at).toBe('2026-09-01T00:00:00.001Z');

        jest.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
        const behind = await client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-nginx-* | WHERE status >= 300',
        });
        expect(behind.esql_updated_at).toBe('2026-09-01T00:00:00.001Z');
      } finally {
        jest.useRealTimers();
      }
    });

    it('replaces the stored attributes instead of merging, so a dropped description is removed', async () => {
      const { client, soClient } = setup();
      const so = makeSavedObject(makeAttributes({ description: 'old' }));
      so.version = 'v1';
      soClient.get.mockResolvedValue(so);

      const updated = await client.update('source-1', {
        title: 'nginx errors',
        tags: ['nginx'],
        esql: makeAttributes().esql,
      });

      expect(updated.description).toBeUndefined();
      expect(soClient.update).toHaveBeenCalledWith(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        'source-1',
        expect.objectContaining({ description: undefined }),
        { ...FULL_UPDATE, version: 'v1' }
      );
    });

    it('keeps slug and view_name when the title changes', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const updated = await client.update('source-1', {
        title: 'renamed',
        tags: ['nginx'],
        esql: makeAttributes().esql,
      });

      expect(updated.slug).toBe('nginx-errors');
      expect(updated.view_name).toBe('$.nightshift.sources.nginx-errors');
    });

    it('always re-puts the view so PUT doubles as repair', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await client.update('source-1', {
        title: 'nginx errors',
        tags: ['nginx'],
        esql: makeAttributes().esql,
      });

      expect(viewsClient.putView).toHaveBeenCalledWith(
        '$.nightshift.sources.nginx-errors',
        makeAttributes().esql
      );
    });

    it('restores the previous attributes when the view cannot be updated', async () => {
      const { client, soClient, viewsClient } = setup();
      const previous = makeAttributes();
      soClient.get.mockResolvedValue(makeSavedObject(previous));
      soClient.update.mockResolvedValueOnce({ ...makeSavedObject(previous), version: 'v2' });
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.update('source-1', { title: 'new', tags: [], esql: 'FROM logs-other-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(soClient.update).toHaveBeenCalledTimes(2);
      expect(soClient.update).toHaveBeenLastCalledWith(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        'source-1',
        previous,
        { ...FULL_UPDATE, version: 'v2' }
      );
    });

    it('skips restore when the update response does not stamp a version', async () => {
      const { client, soClient, viewsClient, logger } = setup();
      const previous = makeAttributes();
      soClient.get.mockResolvedValue(makeSavedObject(previous));
      soClient.update.mockResolvedValueOnce(makeSavedObject(previous));
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.update('source-1', { title: 'new', tags: [], esql: 'FROM logs-other-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(soClient.update).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipped restoring source source-1')
      );
    });

    it('maps a missing saved object to a 404 that does not leak the type name', async () => {
      const { client, soClient } = setup();
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(NIGHTSHIFT_SOURCE_SO_TYPE, 'nope')
      );

      await expect(
        client.update('nope', { title: 't', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
        message: 'Source nope not found',
      });
    });
  });

  describe('list', () => {
    it('paginates, sorts by title and filters on enabled', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.find.mockResolvedValue({
        saved_objects: [{ ...makeSavedObject(), score: 0 }],
        total: 7,
        page: 2,
        per_page: 5,
      });

      const response = await client.list({ page: 2, perPage: 5, enabled: true });

      expect(soClient.find).toHaveBeenCalledWith({
        type: NIGHTSHIFT_SOURCE_SO_TYPE,
        page: 2,
        perPage: 5,
        sortField: 'title',
        sortOrder: 'asc',
        filter: 'nightshift-source.attributes.enabled: true',
      });
      expect(viewsClient.getView).not.toHaveBeenCalled();
      expect(response).toEqual({
        sources: [makeSource()],
        total: 7,
        page: 2,
        per_page: 5,
      });
    });

    it('omits the filter when enabled is not given', async () => {
      const { client, soClient } = setup();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 50 });

      await client.list({ page: 1, perPage: 50 });

      expect(soClient.find).toHaveBeenCalledWith(expect.objectContaining({ filter: undefined }));
    });

    it('escapes KQL metacharacters in the title prefix filter', async () => {
      const { client, soClient } = setup();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 25 });
      const search = 'foo AND "bar"';

      await client.list({ page: 1, perPage: 25, search, enabled: true });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `nightshift-source.attributes.title: ${escapeKuery(
            search
          )}* AND nightshift-source.attributes.enabled: true`,
        })
      );
    });
  });

  describe('delete', () => {
    it('deletes the view first, then the saved object', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const callOrder: string[] = [];
      soClient.delete.mockImplementation(async () => {
        callOrder.push('so');
        return {};
      });
      viewsClient.deleteView.mockImplementation(async () => {
        callOrder.push('view');
      });

      await client.delete('source-1');

      expect(soClient.delete).toHaveBeenCalledWith(NIGHTSHIFT_SOURCE_SO_TYPE, 'source-1');
      expect(viewsClient.deleteView).toHaveBeenCalledWith('$.nightshift.sources.nginx-errors');
      expect(callOrder).toEqual(['view', 'so']);
    });

    it('leaves the saved object in place when the view cannot be deleted', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      viewsClient.deleteView.mockRejectedValue(forbidden('no delete_view'));

      await expect(client.delete('source-1')).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(soClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('flips the flag and touches updated_at only', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const source = await client.setEnabled('source-1', false);

      expect(source.enabled).toBe(false);
      expect(source.esql_updated_at).toBe('2026-09-01T00:00:00.000Z');
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('short-circuits when the flag already matches', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const source = await client.setEnabled('source-1', true);

      expect(source.enabled).toBe(true);
      expect(source.updated_at).toBe('2026-09-01T00:00:00.000Z');
      expect(soClient.update).not.toHaveBeenCalled();
    });
  });
});
