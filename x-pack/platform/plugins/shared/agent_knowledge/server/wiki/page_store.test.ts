/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MAX_PAGE_CONTENT_LENGTH } from '../../common';
import { createPageStore } from './page_store';

const INDEX = 'pages-index';
const SPACE = 'team-a';
const KEY = '885bd83c-f6da-4ddc-b65e-d61bdb80c4fa';
const DOC_ID = `${SPACE}:wiki_detection_rule_${KEY}`;

const statusError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

const storedPage = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-11-20T10:00:00.000Z',
  type: 'detection_rule',
  title: 'Old rule name',
  content: '## Decision history\n\n### Proposal p-1\nDismissed\n',
  tags: ['wiki', 'detection_rule'],
  attributes: {
    status: 'established',
    corroborations: 0,
    slug: KEY,
    space_id: SPACE,
    version: 1,
    workflow_execution_id: 'exec-1',
    entry_ids: ['p-1'],
  },
  ...overrides,
});

/** Index, create and get against a map, with the version checks Elasticsearch applies. */
const createClient = (initial?: object) => {
  const docs = new Map<string, { source: object; seqNo: number }>();
  let seqNo = 0;
  if (initial) {
    docs.set(DOC_ID, { source: initial, seqNo: (seqNo += 1) });
  }
  const indexDocument = async ({
    id,
    document,
    if_seq_no: ifSeqNo,
  }: {
    id: string;
    document: object;
    if_seq_no?: number;
  }) => {
    if (ifSeqNo !== undefined && docs.get(id)?.seqNo !== ifSeqNo) {
      throw statusError(409);
    }
    docs.set(id, { source: document, seqNo: (seqNo += 1) });
    return { _id: id, _seq_no: seqNo, _primary_term: 1 };
  };
  const createDocument = async ({ id, document }: { id: string; document: object }) => {
    if (docs.has(id)) {
      throw statusError(409);
    }
    docs.set(id, { source: document, seqNo: (seqNo += 1) });
    return { _id: id, _seq_no: seqNo, _primary_term: 1 };
  };
  const client = {
    get: jest.fn(async ({ id }: { id: string }) => {
      const doc = docs.get(id);
      if (!doc) {
        throw statusError(404);
      }
      return { found: true, _id: id, _source: doc.source, _seq_no: doc.seqNo, _primary_term: 1 };
    }),
    index: jest.fn(indexDocument),
    create: jest.fn(createDocument),
    indexDocument,
    createDocument,
    /** Simulates another writer changing the page. */
    replace: (source: object) => docs.set(DOC_ID, { source, seqNo: (seqNo += 1) }),
    stored: () => docs.get(DOC_ID)?.source as ReturnType<typeof storedPage> | undefined,
  };
  return { client, esClient: client as unknown as ElasticsearchClient };
};

const createStore = (esClient: ElasticsearchClient) =>
  createPageStore({
    esClient,
    logger: loggingSystemMock.createLogger(),
    index: INDEX,
    pageTypes: ['detection_rule', 'data_source'],
    spaceId: SPACE,
  });

const addEntry = (store: ReturnType<typeof createPageStore>, id = 'p-2') =>
  store.addEntry({
    pageType: 'detection_rule',
    key: KEY,
    title: 'New rule name',
    entriesHeading: 'Decision history',
    entry: { id, content: `### Proposal ${id}\nApproved` },
    provenance: { workflowExecutionId: 'exec-2', conversationId: 'conv-2' },
  });

describe('createPageStore', () => {
  describe('get', () => {
    it("reads the page stored under the space's id for the key, with the caller's client", async () => {
      const { client, esClient } = createClient(storedPage());

      const page = await createStore(esClient).get('detection_rule', KEY);

      expect(client.get).toHaveBeenCalledWith({ index: INDEX, id: DOC_ID }, expect.anything());
      expect(page).toEqual({
        key: KEY,
        title: 'Old rule name',
        content: '## Decision history\n\n### Proposal p-1\nDismissed\n',
        entry_count: 1,
        updated_at: '2026-11-20T10:00:00.000Z',
      });
    });

    it('treats a missing page as no page', async () => {
      const { esClient } = createClient();

      await expect(createStore(esClient).get('detection_rule', KEY)).resolves.toBeUndefined();
    });

    it('surfaces a refused read instead of reporting an empty page', async () => {
      const { client, esClient } = createClient();
      client.get.mockRejectedValue(statusError(403));

      await expect(createStore(esClient).get('detection_rule', KEY)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('refuses a key the shared store would fold into another key', async () => {
      const { client, esClient } = createClient();

      await expect(
        createStore(esClient).get('detection_rule', KEY.toUpperCase())
      ).rejects.toMatchObject({ code: 'invalid_key' });
      expect(client.get).not.toHaveBeenCalled();
    });
  });

  describe('addEntry', () => {
    it('creates the page atomically when it does not exist', async () => {
      const { client, esClient } = createClient();

      const result = await addEntry(createStore(esClient));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 1 });
      expect(client.index).not.toHaveBeenCalled();
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: INDEX, id: DOC_ID, refresh: 'wait_for' }),
        expect.anything()
      );
      expect(client.stored()).toEqual({
        '@timestamp': expect.any(String),
        type: 'detection_rule',
        title: 'New rule name',
        content: '## Decision history\n\n### Proposal p-2\nApproved\n',
        tags: ['wiki', 'detection_rule'],
        attributes: {
          status: 'established',
          corroborations: 0,
          slug: KEY,
          space_id: SPACE,
          version: 1,
          conversation_id: 'conv-2',
          workflow_execution_id: 'exec-2',
          entry_ids: ['p-2'],
        },
      });
    });

    it('adds to an existing page under the version it read, keeping every earlier line', async () => {
      const { client, esClient } = createClient(storedPage());

      const result = await addEntry(createStore(esClient));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 2 });
      const [[request]] = client.index.mock.calls;
      expect(request).toMatchObject({ id: DOC_ID, if_seq_no: 1, if_primary_term: 1 });
      const stored = client.stored();
      expect(stored?.content.startsWith(storedPage().content)).toBe(true);
      expect(stored?.content).toContain('### Proposal p-2\nApproved');
      expect(stored?.title).toBe('New rule name');
      expect(stored?.attributes).toMatchObject({ entry_ids: ['p-1', 'p-2'], version: 2 });
    });

    it('changes nothing when the page already holds the entry', async () => {
      const { client, esClient } = createClient(storedPage());

      const result = await addEntry(createStore(esClient), 'p-1');

      expect(result).toEqual({ outcome: 'already_recorded', entryCount: 1 });
      expect(client.index).not.toHaveBeenCalled();
      expect(client.create).not.toHaveBeenCalled();
    });

    it('re-reads and retries when another writer changed the page in between', async () => {
      const { client, esClient } = createClient(storedPage());
      const otherWriter = storedPage({
        content: `${storedPage().content}\n### Proposal p-9\nOther writer\n`,
        attributes: { ...storedPage().attributes, entry_ids: ['p-1', 'p-9'] },
      });
      client.index.mockImplementationOnce(async (params) => {
        client.replace(otherWriter);
        return client.indexDocument(params);
      });

      const result = await addEntry(createStore(esClient));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 3 });
      expect(client.index).toHaveBeenCalledTimes(2);
      expect(client.stored()?.content).toContain('Other writer');
      expect(client.stored()?.attributes.entry_ids).toEqual(['p-1', 'p-9', 'p-2']);
    });

    it('retries a create that lost to a concurrent create', async () => {
      const { client, esClient } = createClient();
      client.create.mockImplementationOnce(async (params) => {
        client.replace(storedPage());
        return client.createDocument(params);
      });

      const result = await addEntry(createStore(esClient));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 2 });
      expect(client.stored()?.attributes.entry_ids).toEqual(['p-1', 'p-2']);
    });

    it('fails when the id is taken by a document that is not a page', async () => {
      const { client, esClient } = createClient({ type: 'security.handoff', title: '' });

      await expect(addEntry(createStore(esClient))).rejects.toMatchObject({
        code: 'invalid_document',
      });
      expect(client.create).toHaveBeenCalledTimes(1);
      expect(client.index).not.toHaveBeenCalled();
    });

    it('fails when the id holds a page of another type', async () => {
      const { client, esClient } = createClient(storedPage({ type: 'data_source' }));

      await expect(addEntry(createStore(esClient))).rejects.toMatchObject({
        code: 'invalid_document',
      });
      expect(client.index).not.toHaveBeenCalled();
    });

    it('gives up with a conflict after three lost writes', async () => {
      const { client, esClient } = createClient(storedPage());
      client.index.mockRejectedValue(statusError(409));

      await expect(addEntry(createStore(esClient))).rejects.toMatchObject({
        code: 'version_conflict',
      });
      expect(client.index).toHaveBeenCalledTimes(3);
    });

    it('refuses an entry that would take the page past its limit, without writing', async () => {
      const { client, esClient } = createClient(
        storedPage({ content: `## Decision history\n\n${'x'.repeat(MAX_PAGE_CONTENT_LENGTH)}` })
      );

      await expect(addEntry(createStore(esClient))).rejects.toMatchObject({
        code: 'page_too_large',
      });
      expect(client.index).not.toHaveBeenCalled();
    });

    it('surfaces a refused write', async () => {
      const { client, esClient } = createClient();
      client.create.mockRejectedValue(statusError(403));

      await expect(addEntry(createStore(esClient))).rejects.toMatchObject({ statusCode: 403 });
      expect(client.create).toHaveBeenCalledTimes(1);
    });
  });
});
