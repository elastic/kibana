/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { MAX_ANALYSIS_SIGNALS } from '../../common/constants';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import type { Signal } from '../../common/http_api/signals';
import type { AiIndexService } from '../ai_indices/service';
import type { ImprovementsServiceApi } from '../improvements/service';
import { buildFeedbackContext } from './context';
import { getKis } from '../ai_indices/ki_list';
import { selectSignals } from './select_signals';

jest.mock('./select_signals');
jest.mock('../ai_indices/ki_list');

const selectSignalsMock = selectSignals as jest.MockedFunction<typeof selectSignals>;
const getKisMock = getKis as jest.MockedFunction<typeof getKis>;

const WINDOW = { from: '2026-08-25T12:00:00.000Z', to: '2026-09-01T12:00:00.000Z' };

const buildSignal = (id: string, tags: string[]): Signal =>
  ({
    signal_id: id,
    '@timestamp': '2026-09-01T11:00:00.000Z',
    signal_type: 'tool_call',
    tags,
    data: {
      tool: 'execute_esql',
      query_kind: 'ki_retrieval',
      target_index: 'ai-index-idx-orders',
      returned: { row_count: 0 },
    },
  } as unknown as Signal);

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem =>
  ({
    id: 'orders',
    dest: { type: 'index', value: 'ai-index-idx-orders' },
    sources: [{ type: 'esql', value: 'FROM logs-orders' }],
    automations: [],
    ...overrides,
  } as unknown as AiIndexHttpItem);

describe('buildFeedbackContext', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'get'>>;
  let improvementsService: jest.Mocked<Pick<ImprovementsServiceApi, 'historyFor'>>;

  const build = (aiIndex: AiIndexHttpItem = buildAiIndex()) => {
    aiIndexService.get.mockResolvedValue(aiIndex);
    return buildFeedbackContext('orders', {
      esClient,
      aiIndexService: aiIndexService as unknown as AiIndexService,
      improvementsService: improvementsService as unknown as ImprovementsServiceApi,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    aiIndexService = { get: jest.fn() };
    improvementsService = { historyFor: jest.fn().mockResolvedValue([]) };
    selectSignalsMock.mockResolvedValue({
      signals: [buildSignal('a', ['coverage_gap'])],
      spaces: ['default'],
      window: WINDOW,
    });
    getKisMock.mockResolvedValue({
      kis: [],
      summary: { total: 3, counts_by_type: [{ type: 'document', count: 3 }] },
    } as unknown as Awaited<ReturnType<typeof getKis>>);
  });

  it('returns everything a run needs from one call', async () => {
    const context = await build();

    expect(context).toMatchObject({
      ai_index: { id: 'orders' },
      agent_id: agentBuilderDefaultAgentId,
      allowed_actions: [...IMPROVEMENT_ACTIONS],
      run: { signal_window: WINDOW, signal_spaces: ['default'], signal_count: 1 },
      ki_summary: { total: 3 },
      improvement_history: [],
      has_signals: true,
    });
    expect(context.groups).toHaveLength(1);
    expect(context.briefing).toContain('# Feedback analysis for AI index `orders`');
    expect(context.output_schema).toHaveProperty('properties.improvements');
  });

  it('passes the index configuration into signal selection', async () => {
    await build(
      buildAiIndex({
        feedback_analysis: {
          enabled: true,
          signal_filter: 'tags: coverage_gap',
          signal_time_range: { type: 'relative', from: 'now-2d' },
        },
      })
    );

    expect(selectSignalsMock).toHaveBeenCalledWith(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [{ type: 'esql', value: 'FROM logs-orders' }],
      signalTimeRange: { type: 'relative', from: 'now-2d' },
      signalFilter: 'tags: coverage_gap',
      size: MAX_ANALYSIS_SIGNALS,
    });
  });

  it('uses the configured analysis agent', async () => {
    const context = await build(
      buildAiIndex({ feedback_analysis: { enabled: true, agent_id: 'my-analyst' } })
    );

    expect(context.agent_id).toBe('my-analyst');
  });

  it('falls back to the defaults for an index that was never configured for analysis', async () => {
    const context = await build();

    expect(context.agent_id).toBe(agentBuilderDefaultAgentId);
    expect(context.allowed_actions).toEqual([...IMPROVEMENT_ACTIONS]);
  });

  it('narrows the output schema to the actions the index permits', async () => {
    const context = await build(
      buildAiIndex({ feedback_analysis: { enabled: true, allowed_actions: ['add_ki'] } })
    );

    expect(context.allowed_actions).toEqual(['add_ki']);
    expect(context.output_schema).toMatchObject({
      properties: { improvements: { items: { properties: { action: { enum: ['add_ki'] } } } } },
    });
  });

  it('offers no improvements at all for an observe-only index', async () => {
    const context = await build(
      buildAiIndex({ feedback_analysis: { enabled: true, allowed_actions: [] } })
    );

    expect(context.output_schema).not.toHaveProperty('properties.improvements');
    expect(context.briefing).toContain('observation only');
  });

  it('reports no signals when nothing was classified as a problem, so no LLM call is made', async () => {
    selectSignalsMock.mockResolvedValue({
      signals: [buildSignal('a', [])],
      spaces: ['default'],
      window: WINDOW,
    });

    const context = await build();

    expect(context.run.signal_count).toBe(1);
    expect(context.groups).toEqual([]);
    expect(context.has_signals).toBe(false);
  });

  it('reports no signals when the window was empty', async () => {
    selectSignalsMock.mockResolvedValue({ signals: [], spaces: [], window: WINDOW });

    expect((await build()).has_signals).toBe(false);
  });

  it('carries prior improvements into the briefing', async () => {
    improvementsService.historyFor.mockResolvedValue([
      {
        improvement_id: 'imp-1',
        action: 'add_ki',
        title: 'Add a KI for refunds',
        status: 'rejected',
      },
    ] as never);

    const context = await build();

    expect(context.improvement_history).toHaveLength(1);
    expect(context.briefing).toContain('Add a KI for refunds');
  });
});
