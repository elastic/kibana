/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ValidationError } from '@kbn/isomer';
import { createTestKitServices } from './kit/kit_services.mock';
import { createScopedMaterializeClient } from './materialize_client';
import { MaterializerRegistry } from './registry';
import type { MaterializedNode, UnsupportedNode } from './nodes';
import type { DataRequest, MaterializeResults, MaterializeScope, Materializer } from './types';

interface NoteConfig {
  title: string;
  text: string;
}

const parseNote = (config: unknown): NoteConfig => {
  const { title, text } = (config ?? {}) as Partial<NoteConfig>;
  if (typeof title !== 'string' || typeof text !== 'string') {
    throw new Error('title and text must be strings');
  }
  return { title, text };
};

const createNoteMaterializer = (
  overrides: Partial<Materializer<NoteConfig>> = {}
): Materializer<NoteConfig> => ({
  version: 1,
  parse: jest.fn(parseNote),
  describe: jest.fn(({ title }: NoteConfig) => ({ title })),
  plan: jest.fn((): DataRequest[] | UnsupportedNode => []),
  map: jest.fn(({ text }: NoteConfig): MaterializedNode => ({ type: 'markdown', text })),
  ...overrides,
});

const setup = ({
  materializer = createNoteMaterializer(),
  enabled = true,
  validate = jest.fn(async (): Promise<ValidationError[]> => []),
}: {
  materializer?: Materializer<NoteConfig>;
  enabled?: boolean;
  validate?: (node: MaterializedNode) => Promise<ValidationError[]>;
} = {}) => {
  const registry = new MaterializerRegistry();
  registry.register('note', materializer);
  const scope: MaterializeScope = {
    request: httpServerMock.createKibanaRequest(),
    savedObjectsClient: savedObjectsClientMock.create(),
    abortSignal: new AbortController().signal,
  };
  const logger = loggingSystemMock.createLogger();
  const search = { esql: jest.fn() };
  const client = createScopedMaterializeClient({
    registry,
    scope,
    isEnabled: async () => enabled,
    logger,
    search,
    validate,
    getKitServices: createTestKitServices,
    getSelectionServices: jest.fn(async () => {
      throw new Error('No data views in this test.');
    }),
    kibanaVersion: '9.5.0',
    limits: { maxDepth: 1 },
  });
  return { client, scope, logger, search, validate, registry };
};

const note: NoteConfig = { title: 'Open alerts', text: 'There are **3** open alerts.' };

describe('createScopedMaterializeClient', () => {
  describe('materialize', () => {
    it('maps a by-value config with the context it was given', async () => {
      const materializer = createNoteMaterializer();
      const { client } = setup({ materializer });
      const context = { timeZone: 'Europe/Paris' };

      await expect(client.materialize({ type: 'note', config: note }, context)).resolves.toEqual({
        type: 'markdown',
        text: note.text,
      });
      expect(materializer.plan).toHaveBeenCalledWith(note, context);
      expect(materializer.map).toHaveBeenCalledWith(
        note,
        { tables: [], nodes: [] },
        expect.objectContaining({ context })
      );
    });

    it('loads a by-reference config as the scoped user', async () => {
      const load = jest.fn(async () => note);
      const { client, scope } = setup({ materializer: createNoteMaterializer({ load }) });

      await expect(client.materialize({ type: 'note', id: 'note-1' })).resolves.toEqual({
        type: 'markdown',
        text: note.text,
      });
      expect(load).toHaveBeenCalledWith('note-1', scope);
    });

    it('returns unsupported when materialization is off', async () => {
      const materializer = createNoteMaterializer();
      const { client } = setup({ materializer, enabled: false });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason: 'Materialization is not enabled in this Kibana.',
      });
      expect(materializer.parse).not.toHaveBeenCalled();
    });

    it('returns unsupported for a type without a materializer', async () => {
      const { client } = setup();
      await expect(client.materialize({ type: 'map', id: 'map-1' })).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason: 'Kibana cannot materialize saved objects of type "map".',
      });
    });

    it('returns unsupported by reference when the materializer cannot load', async () => {
      const { client } = setup();
      await expect(client.materialize({ type: 'note', id: 'note-1' })).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason:
          'The note config could not be read: Saved objects of type "note" can only be materialized by value.',
      });
    });

    it('returns unsupported for a config that does not parse', async () => {
      const materializer = createNoteMaterializer();
      const { client } = setup({ materializer });

      await expect(
        client.materialize({ type: 'note', config: { title: 'Open alerts' } })
      ).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason: 'The note config could not be read: title and text must be strings',
      });
      expect(materializer.plan).not.toHaveBeenCalled();
    });

    it('returns unsupported when a load fails', async () => {
      const load = jest.fn(async () => {
        throw new Error('Saved object [note/note-1] not found');
      });
      const { client } = setup({ materializer: createNoteMaterializer({ load }) });

      await expect(client.materialize({ type: 'note', id: 'note-1' })).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason: 'The note config could not be read: Saved object [note/note-1] not found',
      });
    });

    it('returns the unsupported node a plan returns', async () => {
      const unsupported: UnsupportedNode = {
        type: 'unsupported',
        title: '',
        reason: 'Region maps are not supported.',
      };
      const materializer = createNoteMaterializer({ plan: jest.fn(() => unsupported) });
      const { client } = setup({ materializer });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        ...unsupported,
        title: 'Open alerts',
        source: expect.objectContaining({
          host: 'kibana',
          meta: expect.objectContaining({ materializer: 'note' }),
        }),
      });
      expect(materializer.map).not.toHaveBeenCalled();
    });

    it("runs ES|QL requests through the user's search client", async () => {
      const datatable = {
        type: 'datatable' as const,
        columns: [{ id: 'count', name: 'count', meta: { type: 'number' as const } }],
        rows: [{ count: 3 }],
      };
      const materializer = createNoteMaterializer({
        plan: jest.fn(() => [
          { kind: 'esql' as const, query: 'FROM alerts | STATS count = COUNT(*)' },
        ]),
        map: jest.fn(
          (_config: NoteConfig, { tables }: MaterializeResults): MaterializedNode => ({
            type: 'markdown',
            text: `There are **${tables[0].rows[0].count}** open alerts.`,
          })
        ),
      });
      const { client, search, scope, validate } = setup({ materializer });
      search.esql.mockResolvedValue({ rawResponse: {}, datatable });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'markdown',
        text: 'There are **3** open alerts.',
      });
      expect(search.esql).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'FROM alerts | STATS count = COUNT(*)\n| LIMIT 1001' }),
        expect.objectContaining({ includeDataTable: true })
      );
      expect(search.esql.mock.calls[0][1].abortSignal).not.toBe(scope.abortSignal);
      expect(validate).toHaveBeenCalled();
    });

    it('returns unsupported for nesting past the depth limit', async () => {
      const nest = (depth: number): NoteConfig => ({ title: `Level ${depth}`, text: '' });
      const materializer = createNoteMaterializer({
        plan: jest.fn(({ title }: NoteConfig) => [
          {
            kind: 'materialize' as const,
            input: { type: 'note', config: nest(Number(title.slice(6)) + 1) },
          },
        ]),
        map: jest.fn((_config: NoteConfig, { nodes }: MaterializeResults) => nodes[0]),
      });
      const { client } = setup({ materializer });

      await expect(client.materialize({ type: 'note', config: nest(0) })).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason: 'This note is nested more than 1 levels deep.',
        source: expect.objectContaining({
          meta: expect.objectContaining({ materializer: 'note', spaceId: 'default' }),
        }),
      });
      expect(materializer.plan).toHaveBeenCalledTimes(2);
    });

    it('returns unsupported, titled from the config, and logs when a mapping throws', async () => {
      const materializer = createNoteMaterializer({
        map: jest.fn(() => {
          throw new Error('no columns');
        }),
      });
      const { client, logger } = setup({ materializer });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        title: 'Open alerts',
        reason: 'Materializing this note failed: no columns',
      });
      expect(logger.warn).toHaveBeenCalledWith('Materializing a note config failed: no columns');
    });

    it('does not reject when describing a failed mapping throws', async () => {
      const materializer = createNoteMaterializer({
        map: jest.fn(() => {
          throw new Error('mapping failed');
        }),
        describe: jest.fn(() => {
          throw new Error('description failed');
        }),
      });
      const { client, logger } = setup({ materializer });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason: 'Materializing this note failed: mapping failed',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Describing a note config failed: description failed'
      );
    });

    it('omits an invalid description from the unsupported fallback', async () => {
      const validate = jest.fn(
        async (node: MaterializedNode): Promise<ValidationError[]> =>
          node.type === 'unsupported' &&
          'title' in node &&
          typeof node.title === 'string' &&
          node.title.length > 500
            ? [{ path: 'title', message: 'is too long' }]
            : []
      );
      const materializer = createNoteMaterializer({
        describe: jest.fn(() => ({ title: 'x'.repeat(501) })),
        map: jest.fn(() => {
          throw new Error('mapping failed');
        }),
      });
      const { client, logger } = setup({ materializer, validate });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        title: 'Content not available',
        reason: 'Materializing this note failed: mapping failed',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Validating the note unsupported description failed: title: is too long'
      );
    });

    it('returns unsupported when output validation rejects the mapped node', async () => {
      const validate = jest.fn(
        async (node: MaterializedNode): Promise<ValidationError[]> =>
          node.type === 'markdown' && 'text' in node && node.text === ''
            ? [{ path: 'text', message: 'is too small' }]
            : []
      );
      const materializer = createNoteMaterializer({
        map: jest.fn((): MaterializedNode => ({ type: 'markdown', text: '' })),
      });
      const { client } = setup({ materializer, validate });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        title: 'Open alerts',
        reason: 'The note materialized into an invalid node: text is too small',
        source: expect.objectContaining({
          host: 'kibana',
          meta: expect.objectContaining({ materializer: 'note' }),
        }),
      });
      expect(validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('filtersForSelection', () => {
    it('rejects a selection on a node without data', async () => {
      const { client } = setup();
      await expect(
        client.filtersForSelection(
          {
            node: 'panel-1',
            kind: 'select',
            target: 'category',
            rows: [0],
            columns: ['host.name'],
            description: 'host.name: web-01',
            values: { 'host.name': 'web-01' },
          },
          { type: 'markdown', text: 'There are **3** open alerts.' }
        )
      ).rejects.toThrow('No data views in this test.');
    });
  });
});
