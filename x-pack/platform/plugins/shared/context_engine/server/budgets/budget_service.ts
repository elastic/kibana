/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import {
  BUDGET_BUCKETS,
  DEFAULT_COST_TIER,
  getBudgetPeriod,
  getBudgetState,
  type AiIndexBudget,
  type AiIndexBudgetStatusResponse,
  type BucketBudgetStatus,
  type BucketSpend,
  type BucketStatuses,
  type BudgetBucket,
  type BudgetPeriod,
  type PricingInfo,
  type SpaceBudgetStatusResponse,
} from '../../common/budgets';
import type { AiIndexBudgetTarget, AiIndexService } from '../ai_indices/service';
import type { PriceCatalog, PriceSnapshot } from './pricing/price_catalog';
import { priceTokenUsage, toPriceKey } from './pricing/price_usage';
import type { SpendSource, UsageRecord } from './spend_sources/types';

export type SpaceBudgetLimits = Partial<Record<BudgetBucket, number>>;

export type BudgetAdmission = { admitted: true } | { admitted: false; reason: string };

export interface BudgetServiceApi {
  getSpaceStatus: (spaceId: string) => Promise<SpaceBudgetStatusResponse>;
  getAiIndexStatus: (spaceId: string, aiIndexId: string) => Promise<AiIndexBudgetStatusResponse>;
  /** Whether new work in `bucket` may start for the AI index; refuses once either limit is spent. */
  checkAdmission: (params: {
    bucket: BudgetBucket;
    spaceId: string;
    aiIndexId: string;
  }) => Promise<BudgetAdmission>;
  setAiIndexBudget: (
    spaceId: string,
    aiIndexId: string,
    budget: AiIndexBudget
  ) => Promise<AiIndexBudget>;
}

const DEFAULT_USAGE_CACHE_TTL_MS = 60_000;

const BUCKET_LIMIT_FIELD: Record<
  BudgetBucket,
  'suggestions_monthly_usd' | 'automations_monthly_usd'
> = {
  suggestions: 'suggestions_monthly_usd',
  automations: 'automations_monthly_usd',
};

const BUCKET_LABELS: Record<BudgetBucket, string> = {
  suggestions: i18n.translate('xpack.contextEngine.budgets.bucket.suggestions', {
    defaultMessage: 'automation suggestions',
  }),
  automations: i18n.translate('xpack.contextEngine.budgets.bucket.automations', {
    defaultMessage: 'automation runs',
  }),
};

const emptySpend = (): BucketSpend => ({
  tokens: { input_tokens: 0, output_tokens: 0, cached_tokens: 0 },
  cost_usd: 0,
  unpriced_tokens: 0,
});

const emptyBucketSpend = (): Record<BudgetBucket, BucketSpend> => ({
  suggestions: emptySpend(),
  automations: emptySpend(),
});

const addUsage = (spend: BucketSpend, record: UsageRecord, prices: PriceSnapshot | undefined) => {
  spend.tokens.input_tokens += record.inputTokens;
  spend.tokens.output_tokens += record.outputTokens;
  spend.tokens.cached_tokens += record.cachedTokens;
  const priceKey = toPriceKey(record.connectorId);
  const price = priceKey ? prices?.prices.get(priceKey) : undefined;
  if (price) {
    spend.cost_usd += priceTokenUsage(record, price);
  } else {
    spend.unpriced_tokens += record.inputTokens + record.outputTokens;
  }
};

const toStatus = (spend: BucketSpend, limitUsd: number | undefined): BucketBudgetStatus => {
  const limit = limitUsd !== undefined && limitUsd > 0 ? limitUsd : undefined;
  return {
    ...(limit !== undefined && { limit_usd: limit }),
    spend,
    state: getBudgetState(spend.cost_usd, limit),
  };
};

const formatUsd = (value: number): string => `$${value.toFixed(2)}`;

interface SpaceSpend {
  period: BudgetPeriod;
  pricing: PricingInfo;
  targets: AiIndexBudgetTarget[];
  space: Record<BudgetBucket, BucketSpend>;
  byAiIndex: Map<string, Record<BudgetBucket, BucketSpend>>;
}

/**
 * Month-to-date spend and limits for Context Engine work. Usage comes from the registered
 * spend sources and is cached per space briefly, because admission is checked on every run.
 * Limits are read fresh on every call so a raised limit takes effect immediately.
 */
export class BudgetService implements BudgetServiceApi {
  private readonly usageCache = new Map<
    string,
    { expiresAtMs: number; usage: Promise<Record<BudgetBucket, UsageRecord[]>> }
  >();

  constructor(
    private readonly deps: {
      aiIndexService: Pick<AiIndexService, 'listBudgetTargets' | 'getBudget' | 'setBudget'>;
      priceCatalog: PriceCatalog;
      getSpendSources: () => readonly SpendSource[];
      getSpaceLimits: (spaceId: string) => Promise<SpaceBudgetLimits>;
      logger: Logger;
      getNow?: () => Date;
      usageCacheTtlMs?: number;
    }
  ) {}

  async getSpaceStatus(spaceId: string): Promise<SpaceBudgetStatusResponse> {
    const [spend, limits] = await Promise.all([
      this.getSpaceSpend(spaceId),
      this.deps.getSpaceLimits(spaceId),
    ]);
    return {
      period: spend.period,
      pricing: spend.pricing,
      space: this.toSpaceStatuses(spend, limits),
      ai_indices: spend.targets.map((target) => ({
        id: target.id,
        buckets: this.toAiIndexStatuses(spend, target),
      })),
    };
  }

  async getAiIndexStatus(spaceId: string, aiIndexId: string): Promise<AiIndexBudgetStatusResponse> {
    const [spend, limits, budget] = await Promise.all([
      this.getSpaceSpend(spaceId),
      this.deps.getSpaceLimits(spaceId),
      this.deps.aiIndexService.getBudget(aiIndexId, spaceId),
    ]);
    const target = spend.targets.find(({ id }) => id === aiIndexId) ?? {
      id: aiIndexId,
      automationWorkflowIds: [],
      budget,
    };
    return {
      ai_index_id: aiIndexId,
      period: spend.period,
      pricing: spend.pricing,
      config: budget,
      cost_tier: budget.cost_tier ?? DEFAULT_COST_TIER,
      ai_index: this.toAiIndexStatuses(spend, { ...target, budget }),
      space: this.toSpaceStatuses(spend, limits),
    };
  }

  async checkAdmission({
    bucket,
    spaceId,
    aiIndexId,
  }: {
    bucket: BudgetBucket;
    spaceId: string;
    aiIndexId: string;
  }): Promise<BudgetAdmission> {
    const status = await this.getAiIndexStatus(spaceId, aiIndexId);
    const resetsOn = status.period.end.slice(0, 10);
    const indexStatus = status.ai_index[bucket];
    if (indexStatus.state === 'exhausted' && indexStatus.limit_usd !== undefined) {
      return {
        admitted: false,
        reason: i18n.translate('xpack.contextEngine.budgets.aiIndexExhaustedReason', {
          defaultMessage:
            'The monthly {bucket} budget of AI index "{aiIndexId}" is spent ({spent} of {limit}). It resets on {resetsOn}.',
          values: {
            bucket: BUCKET_LABELS[bucket],
            aiIndexId,
            spent: formatUsd(indexStatus.spend.cost_usd),
            limit: formatUsd(indexStatus.limit_usd),
            resetsOn,
          },
        }),
      };
    }
    const spaceStatus = status.space[bucket];
    if (spaceStatus.state === 'exhausted' && spaceStatus.limit_usd !== undefined) {
      return {
        admitted: false,
        reason: i18n.translate('xpack.contextEngine.budgets.spaceExhaustedReason', {
          defaultMessage:
            'The monthly {bucket} budget of this space is spent ({spent} of {limit}). It resets on {resetsOn}.',
          values: {
            bucket: BUCKET_LABELS[bucket],
            spent: formatUsd(spaceStatus.spend.cost_usd),
            limit: formatUsd(spaceStatus.limit_usd),
            resetsOn,
          },
        }),
      };
    }
    return { admitted: true };
  }

  async setAiIndexBudget(
    spaceId: string,
    aiIndexId: string,
    budget: AiIndexBudget
  ): Promise<AiIndexBudget> {
    return this.deps.aiIndexService.setBudget(aiIndexId, spaceId, budget);
  }

  private toSpaceStatuses(spend: SpaceSpend, limits: SpaceBudgetLimits): BucketStatuses {
    return {
      suggestions: toStatus(spend.space.suggestions, limits.suggestions),
      automations: toStatus(spend.space.automations, limits.automations),
    };
  }

  private toAiIndexStatuses(spend: SpaceSpend, target: AiIndexBudgetTarget): BucketStatuses {
    const indexSpend = spend.byAiIndex.get(target.id) ?? emptyBucketSpend();
    return {
      suggestions: toStatus(indexSpend.suggestions, target.budget[BUCKET_LIMIT_FIELD.suggestions]),
      automations: toStatus(indexSpend.automations, target.budget[BUCKET_LIMIT_FIELD.automations]),
    };
  }

  private async getSpaceSpend(spaceId: string): Promise<SpaceSpend> {
    const now = this.deps.getNow?.() ?? new Date();
    const period = getBudgetPeriod(now);
    const targets = await this.deps.aiIndexService.listBudgetTargets(spaceId);
    const [usage, prices] = await Promise.all([
      this.getUsage(spaceId, period, targets, now),
      this.deps.priceCatalog.getPrices(),
    ]);

    const space = emptyBucketSpend();
    const byAiIndex = new Map<string, Record<BudgetBucket, BucketSpend>>();
    for (const bucket of BUDGET_BUCKETS) {
      for (const record of usage[bucket]) {
        addUsage(space[bucket], record, prices);
        const indexSpend = byAiIndex.get(record.aiIndexId) ?? emptyBucketSpend();
        addUsage(indexSpend[bucket], record, prices);
        byAiIndex.set(record.aiIndexId, indexSpend);
      }
    }

    return {
      period,
      pricing: prices
        ? { source: 'elastic_price_catalog', fetched_at: prices.fetchedAt, stale: prices.stale }
        : { source: 'unavailable' },
      targets,
      space,
      byAiIndex,
    };
  }

  private getUsage(
    spaceId: string,
    period: BudgetPeriod,
    targets: AiIndexBudgetTarget[],
    now: Date
  ): Promise<Record<BudgetBucket, UsageRecord[]>> {
    const cacheKey = `${spaceId}|${period.start}`;
    const cached = this.usageCache.get(cacheKey);
    if (cached && cached.expiresAtMs > now.getTime()) {
      return cached.usage;
    }

    const usage = this.loadUsage(spaceId, period, targets);
    this.usageCache.set(cacheKey, {
      expiresAtMs: now.getTime() + (this.deps.usageCacheTtlMs ?? DEFAULT_USAGE_CACHE_TTL_MS),
      usage,
    });
    usage.catch(() => this.usageCache.delete(cacheKey));
    return usage;
  }

  private async loadUsage(
    spaceId: string,
    period: BudgetPeriod,
    targets: AiIndexBudgetTarget[]
  ): Promise<Record<BudgetBucket, UsageRecord[]>> {
    const query = {
      spaceId,
      from: new Date(period.start),
      to: new Date(period.end),
      aiIndices: targets,
    };
    const usage: Record<BudgetBucket, UsageRecord[]> = { suggestions: [], automations: [] };
    await Promise.all(
      this.deps.getSpendSources().map(async (source) => {
        try {
          usage[source.bucket].push(...(await source.getUsage(query)));
        } catch (error) {
          this.deps.logger.warn(
            `Spend source "${source.id}" failed for space "${spaceId}"; its usage is not counted: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    );
    return usage;
  }
}
