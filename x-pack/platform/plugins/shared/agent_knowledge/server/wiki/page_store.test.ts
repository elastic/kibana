/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_PAGE_CONTENT_LENGTH } from '../../common';
import { createPageStore } from './page_store';

const INDEX = 'pages-index';
const SPACE = 'team-a';
const KEY = '885bd83c-f6da-4ddc-b65e-d61bdb80c4fa';
const DOC_ID = `${SPACE}:detection_rule:${KEY}`;

const statusError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

const storedPage = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-11-20T10:00:00.000Z',
  type: 'wiki.detection_rule',
  title: 'Old rule name',
  content: '## Decision history\n\n### Proposal p-1\nDismissed\n',
  tags: ['wiki', 'detection_rule'],
  attributes: {
    page_type: 'detection_rule',
    key: KEY,
    space_id: SPACE,
    entry_ids: ['p-1'],
    workflow_execution_id: 'exec-1',
  },
  ...overrides,
});

const createClient = () => {
  const client = {
    get: jest.fn(),
    index: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  };
  return { client, esClient: client as unknown as ElasticsearchClient };
};

const found = (source: object, seqNo = 4, primaryTerm = 1) => ({
  found: true,
  _id: DOC_ID,
  _source: source,
  _seq_no: seqNo,
  _primary_term: primaryTerm,
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
      const { client, esClient } = createClient();
      client.get.mockResolvedValue(found(storedPage()));

      const page = await createPageStore({ esClient, index: INDEX, spaceId: SPACE }).get(
        'detection_rule',
        KEY
      );

      expect(client.get).toHaveBeenCalledWith({ index: INDEX, id: DOC_ID }, expect.anything());
      expect(page).toEqual({
        key: KEY,
        title: 'Old rule name',
        content: '## Decision history\n\n### Proposal p-1\nDismissed\n',
        entry_count: 1,
        updated_at: '2026-11-20T10:00:00.000Z',
      });
    });

    it('treats a missing page or index as no page', async () => {
      const { client, esClient } = createClient();
      client.get.mockRejectedValueOnce(statusError(404));
      client.get.mockResolvedValueOnce({ found: false, _id: DOC_ID });
      const store = createPageStore({ esClient, index: INDEX, spaceId: SPACE });

      await expect(store.get('detection_rule', KEY)).resolves.toBeUndefined();
      await expect(store.get('detection_rule', KEY)).resolves.toBeUndefined();
    });

    it('surfaces a refused read instead of reporting an empty page', async () => {
      const { client, esClient } = createClient();
      client.get.mockRejectedValue(statusError(403));

      await expect(
        createPageStore({ esClient, index: INDEX, spaceId: SPACE }).get('detection_rule', KEY)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('refuses a document that is not this space’s page for the key', async () => {
      const { client, esClient } = createClient();
      client.get.mockResolvedValue(
        found(storedPage({ attributes: { ...storedPage().attributes, space_id: 'other' } }))
      );

      await expect(
        createPageStore({ esClient, index: INDEX, spaceId: SPACE }).get('detection_rule', KEY)
      ).rejects.toMatchObject({ code: 'invalid_document' });
    });
  });

  describe('addEntry', () => {
    it('creates the page atomically when it does not exist', async () => {
      const { client, esClient } = createClient();
      client.get.mockRejectedValue(statusError(404));

      const result = await addEntry(createPageStore({ esClient, index: INDEX, spaceId: SPACE }));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 1 });
      expect(client.index).not.toHaveBeenCalled();
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: INDEX,
          id: DOC_ID,
          refresh: 'wait_for',
          document: expect.objectContaining({
            type: 'wiki.detection_rule',
            title: 'New rule name',
            content: '## Decision history\n\n### Proposal p-2\nApproved\n',
            tags: ['wiki', 'detection_rule'],
            attributes: {
              page_type: 'detection_rule',
              key: KEY,
              space_id: SPACE,
              entry_ids: ['p-2'],
              workflow_execution_id: 'exec-2',
              conversation_id: 'conv-2',
            },
          }),
        }),
        expect.anything()
      );
    });

    it('adds to an existing page under the version it read, keeping every earlier line', async () => {
      const { client, esClient } = createClient();
      client.get.mockResolvedValue(found(storedPage(), 7, 2));

      const result = await addEntry(createPageStore({ esClient, index: INDEX, spaceId: SPACE }));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 2 });
      const [[request]] = client.index.mock.calls;
      expect(request).toMatchObject({ id: DOC_ID, if_seq_no: 7, if_primary_term: 2 });
      expect(request.document.content.startsWith(storedPage().content)).toBe(true);
      expect(request.document.content).toContain('### Proposal p-2\nApproved');
      expect(request.document.title).toBe('New rule name');
      expect(request.document.attributes.entry_ids).toEqual(['p-1', 'p-2']);
    });

    it('changes nothing when the page already holds the entry', async () => {
      const { client, esClient } = createClient();
      client.get.mockResolvedValue(found(storedPage()));

      const result = await addEntry(
        createPageStore({ esClient, index: INDEX, spaceId: SPACE }),
        'p-1'
      );

      expect(result).toEqual({ outcome: 'already_recorded', entryCount: 1 });
      expect(client.index).not.toHaveBeenCalled();
      expect(client.create).not.toHaveBeenCalled();
    });

    it('re-reads and retries when another writer changed the page in between', async () => {
      const { client, esClient } = createClient();
      client.get.mockResolvedValueOnce(found(storedPage(), 7, 2)).mockResolvedValueOnce(
        found(
          storedPage({
            content: `${storedPage().content}\n### Proposal p-9\nOther writer\n`,
            attributes: { ...storedPage().attributes, entry_ids: ['p-1', 'p-9'] },
          }),
          8,
          2
        )
      );
      client.index.mockRejectedValueOnce(statusError(409)).mockResolvedValueOnce({});

      const result = await addEntry(createPageStore({ esClient, index: INDEX, spaceId: SPACE }));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 3 });
      const retried = client.index.mock.calls[1][0];
      expect(retried).toMatchObject({ if_seq_no: 8 });
      expect(retried.document.content).toContain('Other writer');
      expect(retried.document.attributes.entry_ids).toEqual(['p-1', 'p-9', 'p-2']);
    });

    it('retries a create that lost to a concurrent create', async () => {
      const { client, esClient } = createClient();
      client.get.mockRejectedValueOnce(statusError(404)).mockResolvedValueOnce(found(storedPage()));
      client.create.mockRejectedValueOnce(statusError(409));

      const result = await addEntry(createPageStore({ esClient, index: INDEX, spaceId: SPACE }));

      expect(result).toEqual({ outcome: 'recorded', entryCount: 2 });
      expect(client.index).toHaveBeenCalledTimes(1);
    });

    it('gives up with a conflict after three lost writes', async () => {
      const { client, esClient } = createClient();
      client.get.mockResolvedValue(found(storedPage()));
      client.index.mockRejectedValue(statusError(409));

      await expect(
        addEntry(createPageStore({ esClient, index: INDEX, spaceId: SPACE }))
      ).rejects.toMatchObject({ code: 'version_conflict' });
      expect(client.index).toHaveBeenCalledTimes(3);
    });

    it('refuses an entry that would take the page past its limit, without writing', async () => {
      const { client, esClient } = createClient();
      client.get.mockResolvedValue(
        found(
          storedPage({ content: `## Decision history\n\n${'x'.repeat(MAX_PAGE_CONTENT_LENGTH)}` })
        )
      );

      await expect(
        addEntry(createPageStore({ esClient, index: INDEX, spaceId: SPACE }))
      ).rejects.toMatchObject({ code: 'page_too_large' });
      expect(client.index).not.toHaveBeenCalled();
    });

    it('surfaces a refused write', async () => {
      const { client, esClient } = createClient();
      client.get.mockRejectedValue(statusError(404));
      client.create.mockRejectedValue(statusError(403));

      await expect(
        addEntry(createPageStore({ esClient, index: INDEX, spaceId: SPACE }))
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(client.create).toHaveBeenCalledTimes(1);
    });
  });
});
