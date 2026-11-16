/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexSpendTarget } from '../ai_indices/service';
import { SpendService } from './spend_service';
import type { PriceSnapshot } from './pricing/price_catalog';
import type { SpendSource, UsageRecord } from './spend_sources/types';

const HAIKU = '.anthropic-claude-4.5-haiku-chat_completion';
const NOW = new Date('2026-10-13T10:00:00.000Z');

const prices: PriceSnapshot = {
  // $1 per 1M input tokens, $10 per 1M output tokens.
  prices: new Map([['anthropic-claude-4-5-haiku', { input: 1, output: 10 }]]),
  fetchedAt: NOW.toISOString(),
  stale: false,
};

/** `usd` dollars of input tokens on a priced connector. */
const usage = (aiIndexId: string, usd: number, connectorId: string = HAIKU): UsageRecord => ({
  aiIndexId,
  connectorId,
  inputTokens: usd * 1_000_000,
  outputTokens: 0,
  cachedTokens: 0,
});

const createService = ({
  targets = [],
  records = [],
  pricesUnavailable = false,
  extraSources = [],
}: {
  targets?: AiIndexSpendTarget[];
  records?: UsageRecord[];
  pricesUnavailable?: boolean;
  extraSources?: SpendSource[];
}) => {
  const source: SpendSource = {
    id: 'workflow_executions',
    getUsage: jest.fn().mockResolvedValue(records),
  };
  const service = new SpendService({
    aiIndexService: { listSpendTargets: jest.fn().mockResolvedValue(targets) },
    priceCatalog: {
      getPrices: jest.fn().mockResolvedValue(pricesUnavailable ? undefined : prices),
    },
    sources: [source, ...extraSources],
    logger: loggingSystemMock.createLogger(),
    getNow: () => NOW,
  });
  return { service, source };
};

const target = (id: string): AiIndexSpendTarget => ({
  id,
  automationWorkflowIds: [`wf-${id}`],
});

describe('SpendService', () => {
  describe('getAiIndexSpend', () => {
    it('reports month-to-date spend for the index and the space', async () => {
      const { service, source } = createService({
        targets: [target('tickets'), target('docs')],
        records: [usage('tickets', 5), usage('docs', 36)],
      });

      const spend = await service.getAiIndexSpend('default', 'tickets');

      expect(spend.period).toEqual({
        start: '2026-10-01T00:00:00.000Z',
        end: '2026-11-01T00:00:00.000Z',
      });
      expect(spend.ai_index.cost_usd).toBe(5);
      expect(spend.space.cost_usd).toBe(41);
      expect(source.getUsage).toHaveBeenCalledWith({
        spaceId: 'default',
        from: new Date('2026-10-01T00:00:00.000Z'),
        to: new Date('2026-11-01T00:00:00.000Z'),
        aiIndices: [target('tickets'), target('docs')],
      });
    });

    it('reports zero spend for an AI index without usage', async () => {
      const { service } = createService({
        targets: [target('tickets')],
        records: [usage('docs', 4)],
      });

      const spend = await service.getAiIndexSpend('default', 'tickets');

      expect(spend.ai_index).toEqual({
        tokens: { input_tokens: 0, output_tokens: 0, cached_tokens: 0 },
        cost_usd: 0,
        unpriced_tokens: 0,
      });
      expect(spend.space.cost_usd).toBe(4);
    });

    it('counts unpriced tokens separately from cost', async () => {
      const { service } = createService({
        targets: [target('tickets')],
        records: [usage('tickets', 2), { ...usage('tickets', 3), connectorId: 'my-openai' }],
      });

      const { ai_index: aiIndex } = await service.getAiIndexSpend('default', 'tickets');

      expect(aiIndex).toEqual({
        tokens: { input_tokens: 5_000_000, output_tokens: 0, cached_tokens: 0 },
        cost_usd: 2,
        unpriced_tokens: 3_000_000,
      });
    });

    it('reports tokens only when no prices are available', async () => {
      const { service } = createService({
        targets: [target('tickets')],
        records: [usage('tickets', 2)],
        pricesUnavailable: true,
      });

      const spend = await service.getAiIndexSpend('default', 'tickets');

      expect(spend.pricing).toEqual({ source: 'unavailable' });
      expect(spend.ai_index).toMatchObject({ cost_usd: 0, unpriced_tokens: 2_000_000 });
    });
  });

  it('caches usage per space and period between reads', async () => {
    const { service, source } = createService({ targets: [target('tickets')] });

    await service.getSpaceSpend('default');
    await service.getAiIndexSpend('default', 'tickets');

    expect(source.getUsage).toHaveBeenCalledTimes(1);
  });

  it('counts no usage from a failing source instead of failing', async () => {
    const { service } = createService({
      targets: [target('tickets')],
      records: [usage('tickets', 3)],
      extraSources: [{ id: 'broken', getUsage: jest.fn().mockRejectedValue(new Error('boom')) }],
    });

    const spend = await service.getSpaceSpend('default');

    expect(spend.space.cost_usd).toBe(3);
  });

  it('lists every AI index of the space with its spend', async () => {
    const { service } = createService({
      targets: [target('tickets'), target('docs')],
      records: [usage('tickets', 2)],
    });

    const spend = await service.getSpaceSpend('default');

    expect(spend.ai_indices.map(({ id }) => id)).toEqual(['tickets', 'docs']);
    expect(spend.ai_indices[0].spend.cost_usd).toBe(2);
    expect(spend.ai_indices[1].spend.cost_usd).toBe(0);
  });
});
