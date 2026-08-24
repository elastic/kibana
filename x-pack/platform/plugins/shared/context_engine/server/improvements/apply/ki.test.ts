/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AiIndexDest } from '../../../common/http_api/ai_indices';
import {
  KI_EXCLUDED_AT_ATTRIBUTE,
  KI_EXCLUDED_ATTRIBUTE,
  KI_EXCLUDED_REASON_ATTRIBUTE,
} from '../../../common/ki_lifecycle';
import { ApplyImprovementError } from './errors';
import { addKi, editKi, removeKi } from './ki';

const NOW = '2026-08-20T09:00:00.000Z';

const dataStream: AiIndexDest = { type: 'data_stream', value: 'ai-index-ds-support' };
const plainIndex: AiIndexDest = { type: 'index', value: 'ai-index-support' };
const indexPattern: AiIndexDest = { type: 'index', value: 'ai-index-support*' };

const createEsClient = () => elasticsearchServiceMock.createElasticsearchClient();

describe('addKi', () => {
  it('creates the document with a timestamp and returns its id', async () => {
    const esClient = createEsClient();
    esClient.index.mockResolvedValue({ _id: 'ki-1' } as never);

    const id = await addKi({
      esClient,
      dest: dataStream,
      ki: { type: 'faq', title: 'Refund window', content: '30 days' },
      now: NOW,
    });

    expect(id).toBe('ki-1');
    expect(esClient.index).toHaveBeenCalledWith({
      index: 'ai-index-ds-support',
      op_type: 'create',
      refresh: 'wait_for',
      document: {
        '@timestamp': NOW,
        type: 'faq',
        title: 'Refund window',
        content: '30 days',
      },
    });
  });

  it('keeps attributes the agent provided', async () => {
    const esClient = createEsClient();
    esClient.index.mockResolvedValue({ _id: 'ki-1' } as never);

    await addKi({
      esClient,
      dest: plainIndex,
      ki: { title: 'Refund window', attributes: { source: 'feedback_loop' } },
      now: NOW,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: {
          '@timestamp': NOW,
          title: 'Refund window',
          attributes: { source: 'feedback_loop' },
        },
      })
    );
  });

  it('omits fields the agent left unset rather than writing undefined', async () => {
    const esClient = createEsClient();
    esClient.index.mockResolvedValue({ _id: 'ki-1' } as never);

    await addKi({
      esClient,
      dest: plainIndex,
      ki: { title: 'Refund window', description: undefined, tags: undefined },
      now: NOW,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: { '@timestamp': NOW, title: 'Refund window' },
      })
    );
  });

  it('refuses to write to an index pattern', async () => {
    const esClient = createEsClient();

    await expect(
      addKi({ esClient, dest: indexPattern, ki: { title: 'Refund window' }, now: NOW })
    ).rejects.toThrow(ApplyImprovementError);
    expect(esClient.index).not.toHaveBeenCalled();
  });
});

describe('editKi', () => {
  it('updates only the provided fields, by document id', async () => {
    const esClient = createEsClient();
    esClient.updateByQuery.mockResolvedValue({ updated: 1 } as never);

    const id = await editKi({
      esClient,
      dest: dataStream,
      kiId: 'ki-1',
      ki: { content: 'Refunds are accepted for 45 days' },
    });

    expect(id).toBe('ki-1');
    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-support',
        query: { ids: { values: ['ki-1'] } },
        script: expect.objectContaining({
          params: { fields: { content: 'Refunds are accepted for 45 days' } },
        }),
      })
    );
  });

  it('passes attributes separately so existing keys are merged, not replaced', async () => {
    const esClient = createEsClient();
    esClient.updateByQuery.mockResolvedValue({ updated: 1 } as never);

    await editKi({
      esClient,
      dest: dataStream,
      kiId: 'ki-1',
      ki: { title: 'Refund window', attributes: { reviewed: true } },
    });

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        script: expect.objectContaining({
          params: { fields: { title: 'Refund window' }, attributes: { reviewed: true } },
        }),
      })
    );
  });

  it('rejects a suggestion that changes nothing', async () => {
    const esClient = createEsClient();

    await expect(editKi({ esClient, dest: dataStream, kiId: 'ki-1', ki: {} })).rejects.toThrow(
      /does not change any field/
    );
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('reports a missing document rather than silently succeeding', async () => {
    const esClient = createEsClient();
    esClient.updateByQuery.mockResolvedValue({ updated: 0 } as never);

    await expect(
      editKi({ esClient, dest: dataStream, kiId: 'gone', ki: { title: 'Refund window' } })
    ).rejects.toThrow(/was not found/);
  });

  it('surfaces an update failure', async () => {
    const esClient = createEsClient();
    esClient.updateByQuery.mockResolvedValue({
      updated: 0,
      failures: [{ cause: { reason: 'mapping conflict' } }],
    } as never);

    await expect(
      editKi({ esClient, dest: dataStream, kiId: 'ki-1', ki: { title: 'Refund window' } })
    ).rejects.toThrow(/mapping conflict/);
  });
});

describe('removeKi', () => {
  it('flags the document as excluded instead of deleting it', async () => {
    const esClient = createEsClient();
    esClient.updateByQuery.mockResolvedValue({ updated: 1 } as never);

    const id = await removeKi({
      esClient,
      dest: dataStream,
      kiId: 'ki-1',
      now: NOW,
      reason: 'Superseded by the refund policy KI',
    });

    expect(id).toBe('ki-1');
    expect(esClient.delete).not.toHaveBeenCalled();
    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        script: expect.objectContaining({
          params: {
            fields: {},
            attributes: {
              [KI_EXCLUDED_ATTRIBUTE]: true,
              [KI_EXCLUDED_AT_ATTRIBUTE]: NOW,
              [KI_EXCLUDED_REASON_ATTRIBUTE]: 'Superseded by the refund policy KI',
            },
          },
        }),
      })
    );
  });

  it('omits the reason when none was given', async () => {
    const esClient = createEsClient();
    esClient.updateByQuery.mockResolvedValue({ updated: 1 } as never);

    await removeKi({ esClient, dest: dataStream, kiId: 'ki-1', now: NOW });

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        script: expect.objectContaining({
          params: {
            fields: {},
            attributes: {
              [KI_EXCLUDED_ATTRIBUTE]: true,
              [KI_EXCLUDED_AT_ATTRIBUTE]: NOW,
            },
          },
        }),
      })
    );
  });
});
