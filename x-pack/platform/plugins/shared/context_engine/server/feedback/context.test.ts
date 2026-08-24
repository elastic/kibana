/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_FEEDBACK_AGENT_ID } from '../../common/constants';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import type { ImprovementEnvelope } from '../../common/http_api/improvements';
import type { AiIndexService } from '../ai_indices/service';
import { getKiSummary } from '../ai_indices/ki_summary';
import type { ImprovementsServiceApi } from '../improvements/service';
import { getSignalGroups } from '../signals/read';
import { assembleFeedbackContext } from './context';

jest.mock('../ai_indices/ki_summary');
jest.mock('../signals/read');

const getKiSummaryMock = getKiSummary as jest.MockedFunction<typeof getKiSummary>;
const getSignalGroupsMock = getSignalGroups as jest.MockedFunction<typeof getSignalGroups>;

const aiIndex: AiIndexHttpItem = {
  id: 'support',
  managed: false,
  date_created: '2026-07-01T00:00:00.000Z',
  date_modified: '2026-07-01T00:00:00.000Z',
  dest: { type: 'data_stream', value: 'ai-index-ds-support' },
  sources: [],
  automations: [],
};

const improvement: ImprovementEnvelope = {
  improvement_id: 'imp-1',
  ai_index_id: 'support',
  status: 'rejected',
  action: 'add_ki',
  title: 'Add a refund policy KI',
  rationale: 'Refund questions returned no rows.',
  payload: {},
  suggested_at: '2026-08-01T00:00:00.000Z',
  rejected_at: '2026-08-02T00:00:00.000Z',
};

describe('assembleFeedbackContext', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const get = jest.fn();
  const aiIndexService = { get } as unknown as AiIndexService;
  const history = jest.fn();
  const improvementsService = { history } as unknown as ImprovementsServiceApi;

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(aiIndex);
    getKiSummaryMock.mockResolvedValue({ count: 12, countsByType: [{ type: 'faq', count: 12 }] });
    getSignalGroupsMock.mockResolvedValue({ groups: [{ tag: 'empty_retrieval', count: 6 }] });
    history.mockResolvedValue([improvement]);
  });

  it('gathers the index config, KI summary, signal groups, and full improvement history', async () => {
    const context = await assembleFeedbackContext({
      esClient,
      aiIndexService,
      improvementsService,
      aiIndexId: 'support',
      spaceId: 'default',
    });

    expect(context.ai_index).toEqual(aiIndex);
    expect(context.ki_summary).toEqual({ count: 12, counts_by_type: [{ type: 'faq', count: 12 }] });
    expect(context.signal_groups).toEqual([{ tag: 'empty_retrieval', count: 6 }]);
    expect(context.improvements).toEqual([improvement]);
  });

  it("reads the KI summary from the index's own destination", async () => {
    await assembleFeedbackContext({
      esClient,
      aiIndexService,
      improvementsService,
      aiIndexId: 'support',
      spaceId: 'default',
    });

    expect(getKiSummaryMock).toHaveBeenCalledWith(esClient, 'ai-index-ds-support');
  });

  it('scopes the signals and improvements reads to the requested space', async () => {
    const context = await assembleFeedbackContext({
      esClient,
      aiIndexService,
      improvementsService,
      aiIndexId: 'support',
      spaceId: 'marketing',
    });

    expect(context.signals_index).toBe('context-engine-signals-marketing');
    expect(getSignalGroupsMock).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({ spaceId: 'marketing' })
    );
    expect(history).toHaveBeenCalledWith(
      'marketing',
      expect.objectContaining({ aiIndexId: 'support' })
    );
  });

  it("resolves the index's own feedback agent when it has one", async () => {
    get.mockResolvedValue({ ...aiIndex, feedback_agent_id: 'my.support.agent' });

    const context = await assembleFeedbackContext({
      esClient,
      aiIndexService,
      improvementsService,
      aiIndexId: 'support',
      spaceId: 'default',
    });

    expect(context.agent_id).toBe('my.support.agent');
  });

  it('falls back to the built-in agent when the index has not chosen one', async () => {
    const context = await assembleFeedbackContext({
      esClient,
      aiIndexService,
      improvementsService,
      aiIndexId: 'support',
      spaceId: 'default',
    });

    expect(context.agent_id).toBe(CONTEXT_ENGINE_FEEDBACK_AGENT_ID);
  });

  it('renders the prompt from the same payload it returns, so both consumers agree', async () => {
    const context = await assembleFeedbackContext({
      esClient,
      aiIndexService,
      improvementsService,
      aiIndexId: 'support',
      spaceId: 'default',
    });

    expect(context.prompt).toContain('AI index `support`');
    expect(context.prompt).toContain('context-engine-signals-default');
    expect(context.prompt).toContain('empty_retrieval: 6');
    expect(context.prompt).toContain('[rejected] add_ki: Add a refund policy KI');
  });

  it('propagates a missing AI index so the route can answer 404', async () => {
    get.mockRejectedValue(new Error('AI index [nope] not found'));

    await expect(
      assembleFeedbackContext({
        esClient,
        aiIndexService,
        improvementsService,
        aiIndexId: 'nope',
        spaceId: 'default',
      })
    ).rejects.toThrow('AI index [nope] not found');
  });
});
