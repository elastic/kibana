/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { AiIndexNotFoundError } from '@kbn/context-engine-plugin/server/ai_indices/errors';
import {
  findKiRevision,
  hardDeleteKiRevision,
  putKiRevision,
} from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { fileKiId, MemoryStore } from './memory';
import type { SourceFile } from './sources';
import type { Summary } from './summarize';

jest.mock('@kbn/context-engine-plugin/server/ai_indices/ki_revision', () => ({
  findKiRevision: jest.fn(),
  putKiRevision: jest.fn(),
  hardDeleteKiRevision: jest.fn(),
}));
const find = findKiRevision as jest.Mock;
const put = putKiRevision as jest.Mock;
const hardDelete = hardDeleteKiRevision as jest.Mock;

const dest = { type: 'index' as const, value: 'ai-index-idx-connector-memory' };
const file: SourceFile = {
  id: 'f1',
  name: 'plan.md',
  isFolder: false,
  folder: 'root',
  modifiedAt: '2026-11-01T00:00:00.000Z',
  size: 10,
  url: 'https://x/f1',
};
const llm: Summary = { kind: 'llm', summary: 'A plan.', keyPoints: ['one'], questions: [] };
const excerpt: Summary = {
  kind: 'excerpt',
  summary: 'Start of the plan.',
  keyPoints: [],
  questions: [],
};

const setup = () => {
  const service = {
    get: jest
      .fn()
      .mockResolvedValue({ dest, memory_enabled: true, automations: [], sources: [], traces: [] }),
    create: jest.fn().mockResolvedValue(undefined),
    put: jest.fn().mockResolvedValue('updated'),
    addAutomation: jest.fn(),
  };
  const store = new MemoryStore({
    getAiIndexService: () => service as unknown as AiIndexService,
    aiIndexId: 'connector-memory',
    ttlDays: 30,
    logger: loggingSystemMock.createLogger(),
    now: () => new Date('2026-11-02T12:00:00.000Z'),
  });
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const remember = (summary?: Summary, over: Partial<SourceFile> = {}, reader = 'u_a') =>
    store.remember({
      esClient,
      spaceId: 'default',
      connectorId: 'drive-1',
      connectorType: '.google_drive',
      file: { ...file, ...over },
      summary,
      permission:
        reader === '' ? { scope: 'connector' } : { scope: 'per_user', profileUid: reader },
    });
  return { service, store, esClient, remember };
};

/** What is stored: a file cached as `kind`, readable by `visibleTo`. */
const stored = (kind: string, visibleTo: string[] = ['u_a'], over: Record<string, unknown> = {}) =>
  find.mockResolvedValue({
    index: dest.value,
    documentId: 'd',
    seqNo: 1,
    primaryTerm: 1,
    source: {
      title: 'old',
      attributes: {
        summary_kind: kind,
        source_modified: file.modifiedAt,
        size_bytes: 10,
        visible_to: visibleTo,
        ...over,
      },
    },
  });

describe('MemoryStore.remember', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    find.mockResolvedValue(undefined);
  });

  it('writes a new file under an id made from the connector and the source’s own id, readable by whoever read it', async () => {
    const { remember } = setup();

    expect(await remember(llm)).toBe(true);

    const { kiId, document, failIfExists } = put.mock.calls[0][0];
    expect(kiId).toBe(fileKiId('drive-1', 'f1'));
    expect(failIfExists).toBe(true);
    expect(document).toMatchObject({
      type: 'document',
      title: 'plan.md',
      attributes: {
        summary_kind: 'llm',
        permission_scope: 'per_user',
        visible_to: ['u_a'],
        document_id: 'f1',
        document_url: 'https://x/f1',
      },
    });
    expect(document.content).toContain('A plan.');
  });

  it('writes a file read through a shared connector with no reader list, and a name-only file as names', async () => {
    const { remember } = setup();

    await remember(undefined, {}, '');

    expect(put.mock.calls[0][0].document.attributes).toMatchObject({
      summary_kind: 'names',
      permission_scope: 'connector',
    });
    expect(put.mock.calls[0][0].document.attributes).not.toHaveProperty('visible_to');
  });

  it.each([
    ['a model summary is not replaced by a name or an excerpt', 'llm', undefined, false],
    ['a model summary is not replaced by an excerpt', 'llm', 'excerpt', false],
    ['a name is replaced by a better record', 'names', 'llm', true],
    ['an excerpt is replaced by a model summary', 'excerpt', 'llm', true],
  ])('%s', async (_name, storedKind, newKind, written) => {
    const { remember } = setup();
    stored(storedKind);

    expect(
      await remember(newKind === 'llm' ? llm : newKind === 'excerpt' ? excerpt : undefined)
    ).toBe(written);
  });

  it('rewrites a changed file at the same quality, and leaves an unchanged one alone', async () => {
    const { remember } = setup();
    stored('llm');

    expect(await remember(llm)).toBe(false);
    expect(await remember(llm, { size: 99 })).toBe(true);
  });

  it('only adds a new reader to a file that needs no rewrite, keeping what was cached', async () => {
    const { remember } = setup();
    stored('llm', ['u_a']);

    expect(await remember(undefined, {}, 'u_b')).toBe(true);

    const { document } = put.mock.calls[0][0];
    expect(document.attributes).toMatchObject({ summary_kind: 'llm', visible_to: ['u_a', 'u_b'] });
    expect(document.title).toBe('old');
  });
});

describe('MemoryStore.setPrincipal', () => {
  beforeEach(() => jest.resetAllMocks());
  const args = (principal: string, action: 'add' | 'remove') => ({
    spaceId: 'default',
    kiId: 'k',
    principal,
    action,
  });

  it('adds a reader, removes one, and deletes a file nobody can see any more', async () => {
    const { store, esClient } = setup();

    stored('llm', ['u_a']);
    await store.setPrincipal({ esClient, ...args('u_b', 'add') });
    expect(put.mock.calls[0][0].document.attributes.visible_to).toEqual(['u_a', 'u_b']);

    stored('llm', ['u_a', 'u_b']);
    await store.setPrincipal({ esClient, ...args('u_b', 'remove') });
    expect(put.mock.calls[1][0].document.attributes.visible_to).toEqual(['u_a']);

    stored('llm', ['u_a']);
    await store.setPrincipal({ esClient, ...args('u_a', 'remove') });
    expect(hardDelete).toHaveBeenCalledTimes(1);
  });

  it('leaves a file with no reader list alone: it is public to the space', async () => {
    const { store, esClient } = setup();
    stored('llm', []);

    await store.setPrincipal({ esClient, ...args('u_b', 'remove') });

    expect(put).not.toHaveBeenCalled();
    expect(hardDelete).not.toHaveBeenCalled();
  });
});

describe('MemoryStore index', () => {
  beforeEach(() => jest.resetAllMocks());

  it('creates the AI index when there is none, and lists the connectors and its own data as sources once', async () => {
    const { service, store } = setup();
    service.get.mockRejectedValueOnce(new AiIndexNotFoundError('connector-memory'));

    await store.listAsSources('default', ['drive-1', 's3-1']);
    await store.listAsSources('default', ['drive-1']);

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.put).toHaveBeenCalledTimes(1);
    expect(service.put.mock.calls[0][2].sources).toEqual([
      { type: 'esql', value: `FROM ${dest.value}` },
      { type: 'connector', value: 'drive-1' },
      { type: 'connector', value: 's3-1' },
    ]);
  });

  it('takes a workflow off the index as an automation, keeping the rest of the index', async () => {
    const { service, store } = setup();
    service.get.mockResolvedValue({
      dest,
      memory_enabled: true,
      automations: [
        { type: 'workflow', value: 'wf-1' },
        { type: 'workflow', value: 'wf-2' },
      ],
      sources: [{ type: 'connector', value: 'drive-1' }],
      traces: [],
    });

    await store.detachAutomation('default', 'wf-1');

    expect(service.put.mock.calls[0][2]).toMatchObject({
      automations: [{ type: 'workflow', value: 'wf-2' }],
      sources: [{ type: 'connector', value: 'drive-1' }],
    });
  });
});
