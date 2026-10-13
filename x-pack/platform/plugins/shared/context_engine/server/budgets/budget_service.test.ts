/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexBudget } from '../../common/budgets';
import type { AiIndexBudgetTarget } from '../ai_indices/service';
import { BudgetService, type SpaceBudgetLimits } from './budget_service';
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
  budgets = {},
  limits = {},
  automations = [],
  suggestions = [],
  pricesUnavailable = false,
}: {
  targets?: AiIndexBudgetTarget[];
  budgets?: Record<string, AiIndexBudget>;
  limits?: SpaceBudgetLimits;
  automations?: UsageRecord[];
  suggestions?: UsageRecord[];
  pricesUnavailable?: boolean;
}) => {
  const automationsSource: SpendSource = {
    id: 'automations',
    bucket: 'automations',
    getUsage: jest.fn().mockResolvedValue(automations),
  };
  const suggestionsSource: SpendSource = {
    id: 'suggestions',
    bucket: 'suggestions',
    getUsage: jest.fn().mockResolvedValue(suggestions),
  };
  const aiIndexService = {
    listBudgetTargets: jest.fn().mockResolvedValue(targets),
    getBudget: jest.fn(async (id: string) => budgets[id] ?? {}),
    setBudget: jest.fn(async (_id: string, _space: string, budget: AiIndexBudget) => budget),
  };
  const service = new BudgetService({
    aiIndexService,
    priceCatalog: {
      getPrices: jest.fn().mockResolvedValue(pricesUnavailable ? undefined : prices),
    },
    getSpendSources: () => [automationsSource, suggestionsSource],
    getSpaceLimits: jest.fn().mockResolvedValue(limits),
    logger: loggingSystemMock.createLogger(),
    getNow: () => NOW,
  });
  return { service, aiIndexService, automationsSource, suggestionsSource };
};

const target = (id: string, budget: AiIndexBudget = {}): AiIndexBudgetTarget => ({
  id,
  automationWorkflowIds: [`wf-${id}`],
  budget,
});

describe('BudgetService', () => {
  describe('getAiIndexStatus', () => {
    it('reports month-to-date spend for the index and the space', async () => {
      const { service } = createService({
        targets: [target('tickets', { automations_monthly_usd: 20 }), target('docs')],
        budgets: { tickets: { automations_monthly_usd: 20, cost_tier: 'cheap' } },
        limits: { automations: 50, suggestions: 0 },
        automations: [usage('tickets', 5), usage('docs', 36)],
        suggestions: [usage('tickets', 1)],
      });

      const status = await service.getAiIndexStatus('default', 'tickets');

      expect(status.period).toEqual({
        start: '2026-10-01T00:00:00.000Z',
        end: '2026-11-01T00:00:00.000Z',
      });
      expect(status.cost_tier).toBe('cheap');
      expect(status.ai_index.automations).toMatchObject({
        limit_usd: 20,
        state: 'ok',
        spend: { cost_usd: 5 },
      });
      expect(status.space.automations).toMatchObject({
        limit_usd: 50,
        state: 'warning',
        spend: { cost_usd: 41 },
      });
      expect(status.space.suggestions.state).toBe('unlimited');
      expect(status.space.suggestions).not.toHaveProperty('limit_usd');
    });

    it('defaults the cost tier to medium', async () => {
      const { service } = createService({ targets: [target('tickets')] });

      await expect(service.getAiIndexStatus('default', 'tickets')).resolves.toMatchObject({
        cost_tier: 'medium',
        config: {},
      });
    });

    it('counts unpriced tokens separately from cost', async () => {
      const { service } = createService({
        targets: [target('tickets')],
        automations: [usage('tickets', 2), { ...usage('tickets', 3), connectorId: 'my-openai' }],
      });

      const { ai_index: aiIndex } = await service.getAiIndexStatus('default', 'tickets');

      expect(aiIndex.automations.spend).toEqual({
        tokens: { input_tokens: 5_000_000, output_tokens: 0, cached_tokens: 0 },
        cost_usd: 2,
        unpriced_tokens: 3_000_000,
      });
    });

    it('reports tokens only when no prices are available', async () => {
      const { service } = createService({
        targets: [target('tickets')],
        automations: [usage('tickets', 2)],
        pricesUnavailable: true,
      });

      const status = await service.getAiIndexStatus('default', 'tickets');

      expect(status.pricing).toEqual({ source: 'unavailable' });
      expect(status.ai_index.automations.spend).toMatchObject({
        cost_usd: 0,
        unpriced_tokens: 2_000_000,
      });
    });
  });

  describe('checkAdmission', () => {
    it('admits while both limits have room', async () => {
      const { service } = createService({
        targets: [target('tickets', { automations_monthly_usd: 20 })],
        budgets: { tickets: { automations_monthly_usd: 20 } },
        limits: { automations: 50 },
        automations: [usage('tickets', 10)],
      });

      await expect(
        service.checkAdmission({ bucket: 'automations', spaceId: 'default', aiIndexId: 'tickets' })
      ).resolves.toEqual({ admitted: true });
    });

    it('refuses once the AI index limit is spent', async () => {
      const { service } = createService({
        targets: [target('tickets', { automations_monthly_usd: 20 })],
        budgets: { tickets: { automations_monthly_usd: 20 } },
        automations: [usage('tickets', 21)],
      });

      const admission = await service.checkAdmission({
        bucket: 'automations',
        spaceId: 'default',
        aiIndexId: 'tickets',
      });

      expect(admission).toEqual({
        admitted: false,
        reason: expect.stringContaining('AI index "tickets" is spent ($21.00 of $20.00)'),
      });
      expect(admission.admitted === false && admission.reason).toContain('2026-11-01');
    });

    it('refuses every index once the space limit is spent', async () => {
      const { service } = createService({
        targets: [target('tickets'), target('docs')],
        limits: { suggestions: 20 },
        suggestions: [usage('docs', 20)],
      });

      await expect(
        service.checkAdmission({ bucket: 'suggestions', spaceId: 'default', aiIndexId: 'tickets' })
      ).resolves.toEqual({
        admitted: false,
        reason: expect.stringContaining('suggestions budget of this space is spent'),
      });
    });

    it('treats a zero limit as no limit', async () => {
      const { service } = createService({
        targets: [target('tickets', { automations_monthly_usd: 0 })],
        budgets: { tickets: { automations_monthly_usd: 0 } },
        limits: { automations: 0 },
        automations: [usage('tickets', 1000)],
      });

      await expect(
        service.checkAdmission({ bucket: 'automations', spaceId: 'default', aiIndexId: 'tickets' })
      ).resolves.toEqual({ admitted: true });
    });
  });

  it('caches usage per space and period between checks', async () => {
    const { service, automationsSource } = createService({ targets: [target('tickets')] });

    await service.getSpaceStatus('default');
    await service.checkAdmission({
      bucket: 'automations',
      spaceId: 'default',
      aiIndexId: 'tickets',
    });

    expect(automationsSource.getUsage).toHaveBeenCalledTimes(1);
  });

  it('counts no usage from a failing source instead of failing', async () => {
    const { service, suggestionsSource } = createService({
      targets: [target('tickets')],
      automations: [usage('tickets', 3)],
    });
    (suggestionsSource.getUsage as jest.Mock).mockRejectedValue(new Error('boom'));

    const status = await service.getSpaceStatus('default');

    expect(status.space.automations.spend.cost_usd).toBe(3);
    expect(status.space.suggestions.spend.cost_usd).toBe(0);
  });

  it('lists every AI index of the space with its statuses', async () => {
    const { service } = createService({
      targets: [target('tickets', { suggestions_monthly_usd: 1 }), target('docs')],
      suggestions: [usage('tickets', 2)],
    });

    const status = await service.getSpaceStatus('default');

    expect(status.ai_indices.map(({ id }) => id)).toEqual(['tickets', 'docs']);
    expect(status.ai_indices[0].buckets.suggestions.state).toBe('exhausted');
    expect(status.ai_indices[1].buckets.suggestions.state).toBe('unlimited');
  });

  it('stores the AI index budget through the AI index service', async () => {
    const { service, aiIndexService } = createService({});

    await service.setAiIndexBudget('default', 'tickets', { cost_tier: 'expensive' });

    expect(aiIndexService.setBudget).toHaveBeenCalledWith('tickets', 'default', {
      cost_tier: 'expensive',
    });
  });
});
