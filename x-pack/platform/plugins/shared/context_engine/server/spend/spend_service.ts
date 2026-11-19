/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  getSpendPeriod,
  type AiIndexSpendResponse,
  type PricingInfo,
  type SpaceSpendResponse,
  type SpendPeriod,
  type SpendTotals,
} from '../../common/spend';
import type { AiIndexService, AiIndexSpendTarget } from '../ai_indices/service';
import type { PriceCatalog, PriceSnapshot } from './pricing/price_catalog';
import { priceTokenUsage, toPriceKey } from './pricing/price_usage';
import type { SpendSource, UsageRecord } from './spend_sources/types';

export interface SpendServiceApi {
  getSpaceSpend: (spaceId: string) => Promise<SpaceSpendResponse>;
  getAiIndexSpend: (spaceId: string, aiIndexId: string) => Promise<AiIndexSpendResponse>;
}

const DEFAULT_USAGE_CACHE_TTL_MS = 60_000;

const emptySpend = (): SpendTotals => ({
  tokens: { input_tokens: 0, output_tokens: 0, cached_tokens: 0 },
  cost_usd: 0,
  unpriced_tokens: 0,
});

const addUsage = (spend: SpendTotals, record: UsageRecord, prices: PriceSnapshot | undefined) => {
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

interface SpaceSpend {
  period: SpendPeriod;
  pricing: PricingInfo;
  targets: AiIndexSpendTarget[];
  space: SpendTotals;
  byAiIndex: Map<string, SpendTotals>;
}

/**
 * Month-to-date AI spend of the automation workflows attached to AI indices, per space and per
 * AI index. Usage is cached per space briefly, since every read aggregates the producers' ledgers.
 */
export class SpendService implements SpendServiceApi {
  private readonly usageCache = new Map<
    string,
    { expiresAtMs: number; usage: Promise<UsageRecord[]> }
  >();

  constructor(
    private readonly deps: {
      aiIndexService: Pick<AiIndexService, 'listSpendTargets'>;
      priceCatalog: PriceCatalog;
      sources: readonly SpendSource[];
      logger: Logger;
      getNow?: () => Date;
      usageCacheTtlMs?: number;
    }
  ) {}

  async getSpaceSpend(spaceId: string): Promise<SpaceSpendResponse> {
    const spend = await this.loadSpaceSpend(spaceId);
    return {
      period: spend.period,
      pricing: spend.pricing,
      space: spend.space,
      ai_indices: spend.targets.map(({ id }) => ({
        id,
        spend: spend.byAiIndex.get(id) ?? emptySpend(),
      })),
    };
  }

  async getAiIndexSpend(spaceId: string, aiIndexId: string): Promise<AiIndexSpendResponse> {
    const spend = await this.loadSpaceSpend(spaceId);
    return {
      ai_index_id: aiIndexId,
      period: spend.period,
      pricing: spend.pricing,
      ai_index: spend.byAiIndex.get(aiIndexId) ?? emptySpend(),
      space: spend.space,
    };
  }

  private async loadSpaceSpend(spaceId: string): Promise<SpaceSpend> {
    const now = this.deps.getNow?.() ?? new Date();
    const period = getSpendPeriod(now);
    const targets = await this.deps.aiIndexService.listSpendTargets(spaceId);
    const [usage, prices] = await Promise.all([
      this.getUsage(spaceId, period, targets, now),
      this.deps.priceCatalog.getPrices(),
    ]);

    const space = emptySpend();
    const byAiIndex = new Map<string, SpendTotals>();
    for (const record of usage) {
      addUsage(space, record, prices);
      const indexSpend = byAiIndex.get(record.aiIndexId) ?? emptySpend();
      addUsage(indexSpend, record, prices);
      byAiIndex.set(record.aiIndexId, indexSpend);
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
    period: SpendPeriod,
    targets: AiIndexSpendTarget[],
    now: Date
  ): Promise<UsageRecord[]> {
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
    period: SpendPeriod,
    targets: AiIndexSpendTarget[]
  ): Promise<UsageRecord[]> {
    const query = {
      spaceId,
      from: new Date(period.start),
      to: new Date(period.end),
      aiIndices: targets,
    };
    const usage = await Promise.all(
      this.deps.sources.map(async (source) => {
        try {
          return await source.getUsage(query);
        } catch (error) {
          this.deps.logger.warn(
            `Spend source "${source.id}" failed for space "${spaceId}"; its usage is not counted: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return [];
        }
      })
    );
    return usage.flat();
  }
}
