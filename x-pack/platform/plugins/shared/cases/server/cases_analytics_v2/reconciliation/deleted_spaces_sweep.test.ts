/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { sweepDeletedSpaces } from './deleted_spaces_sweep';

const spacesFindResponse = (ids: string[]) =>
  ({
    saved_objects: ids.map((id) => ({ id, type: 'space', attributes: {}, references: [] })),
    total: ids.length,
    per_page: 1000,
    page: 1,
  } as unknown as SavedObjectsFindResponse);

const indexedSpacesResponse = (ids: string[]) =>
  ({
    aggregations: {
      space_ids: { buckets: ids.map((id) => ({ key: { space_id: id }, doc_count: 1 })) },
    },
  } as unknown as estypes.SearchResponse);

describe('sweepDeletedSpaces', () => {
  const setup = ({ indexed, existing }: { indexed: string[]; existing: string[] }) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(indexedSpacesResponse(indexed));
    esClient.deleteByQuery.mockResolvedValue({ deleted: 3 });

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue(spacesFindResponse(existing));

    const sweep = () =>
      sweepDeletedSpaces({
        esClient,
        savedObjectsClient,
        logger: loggerMock.create(),
        signal: new AbortController().signal,
      });

    return { esClient, sweep };
  };

  it('deletes the analytics docs of indexed spaces that no longer exist', async () => {
    const { esClient, sweep } = setup({
      indexed: ['default', 'space1', 'deleted-space'],
      existing: ['default', 'space1'],
    });

    await sweep();

    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery.mock.calls[0][0]).toMatchObject({
      index: ['.cases', '.cases-activity', '.cases-attachments'],
      query: { terms: { space_id: ['deleted-space'] } },
    });
  });

  it('never deletes the default space even without a default space saved object', async () => {
    const { esClient, sweep } = setup({ indexed: ['default'], existing: ['space1'] });

    await sweep();

    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('deletes nothing when no spaces are found', async () => {
    const { esClient, sweep } = setup({ indexed: ['space1'], existing: [] });

    await sweep();

    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });
});
