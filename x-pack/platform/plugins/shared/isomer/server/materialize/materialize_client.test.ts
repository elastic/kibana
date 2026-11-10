/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createScopedMaterializeClient } from './materialize_client';
import { MaterializerRegistry } from './registry';
import type { MaterializedNode, UnsupportedNode } from './nodes';
import type { DataRequest, MaterializeScope, Materializer } from './types';

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
  validateNode = async () => {},
}: {
  materializer?: Materializer<NoteConfig>;
  enabled?: boolean;
  validateNode?: (node: MaterializedNode) => Promise<void>;
} = {}) => {
  const registry = new MaterializerRegistry();
  registry.register('note', materializer);
  const scope: MaterializeScope = {
    request: httpServerMock.createKibanaRequest(),
    savedObjectsClient: savedObjectsClientMock.create(),
    abortSignal: new AbortController().signal,
  };
  const logger = loggingSystemMock.createLogger();
  const client = createScopedMaterializeClient({
    registry,
    scope,
    isEnabled: async () => enabled,
    validateNode,
    logger,
  });
  return { client, scope, logger };
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
      expect(materializer.map).toHaveBeenCalledWith(note, { tables: [], nodes: [] }, { context });
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
        reason: 'Materialization is not enabled in this Kibana.',
      });
      expect(materializer.parse).not.toHaveBeenCalled();
    });

    it('returns unsupported for a type without a materializer', async () => {
      const { client } = setup();
      await expect(client.materialize({ type: 'map', id: 'map-1' })).resolves.toEqual({
        type: 'unsupported',
        reason: 'Kibana cannot materialize saved objects of type "map".',
      });
    });

    it('returns unsupported by reference when the materializer cannot load', async () => {
      const { client } = setup();
      await expect(client.materialize({ type: 'note', id: 'note-1' })).resolves.toEqual({
        type: 'unsupported',
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
        reason: 'The note config could not be read: Saved object [note/note-1] not found',
      });
    });

    it('returns the unsupported node a plan returns', async () => {
      const unsupported = {
        type: 'unsupported' as const,
        reason: 'Region maps are not supported.',
      };
      const materializer = createNoteMaterializer({ plan: jest.fn(() => unsupported) });
      const { client } = setup({ materializer });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toBe(unsupported);
      expect(materializer.map).not.toHaveBeenCalled();
    });

    it('returns unsupported, titled from the config, when a plan needs data it cannot fetch', async () => {
      const materializer = createNoteMaterializer({
        plan: jest.fn(() => [{ kind: 'esql' as const, query: 'FROM logs | STATS COUNT(*)' }]),
      });
      const { client } = setup({ materializer });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        title: 'Open alerts',
        reason: 'Kibana cannot run "esql" data requests for materialization.',
      });
      expect(materializer.map).not.toHaveBeenCalled();
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
        reason: 'Materializing this note failed: mapping failed',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Describing a note config failed: description failed'
      );
    });

    it('omits an invalid description from the unsupported fallback', async () => {
      const validateNode = jest.fn(async (node: MaterializedNode) => {
        if (
          node.type === 'unsupported' &&
          'title' in node &&
          typeof node.title === 'string' &&
          node.title.length > 500
        ) {
          throw new Error('body[0].title: is too long');
        }
      });
      const materializer = createNoteMaterializer({
        describe: jest.fn(() => ({ title: 'x'.repeat(501) })),
        map: jest.fn(() => {
          throw new Error('mapping failed');
        }),
      });
      const { client, logger } = setup({ materializer, validateNode });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        reason: 'Materializing this note failed: mapping failed',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Validating the note unsupported description failed: body[0].title: is too long'
      );
    });

    it('returns unsupported when output validation rejects the mapped node', async () => {
      const validateNode = jest.fn(async (node: MaterializedNode) => {
        if (node.type === 'markdown' && 'text' in node && node.text === '') {
          throw new Error('body[0].text: is too small');
        }
      });
      const materializer = createNoteMaterializer({
        map: jest.fn((): MaterializedNode => ({ type: 'markdown', text: '' })),
      });
      const { client } = setup({ materializer, validateNode });

      await expect(client.materialize({ type: 'note', config: note })).resolves.toEqual({
        type: 'unsupported',
        title: 'Open alerts',
        reason: 'Materializing this note failed: body[0].text: is too small',
      });
      expect(validateNode).toHaveBeenCalledTimes(2);
    });
  });

  describe('filtersForSelection', () => {
    it('rejects a selection it cannot turn into filters', async () => {
      const { client } = setup();
      await expect(
        client.filtersForSelection(
          {
            node: 'panel-1',
            kind: 'select',
            target: 'datum',
            rows: [0],
            columns: ['host.name'],
            description: 'host.name: web-01',
            values: { 'host.name': 'web-01' },
          },
          { type: 'markdown' }
        )
      ).rejects.toThrow('Kibana cannot turn a selection on node "panel-1" into filters.');
    });
  });
});
