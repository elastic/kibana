/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  CostPeriodResponse as CostPeriodResult,
  GroupWorkflowAttributionResponse,
  SignificantEventsCostResponse,
} from '../../../common/cost';
import type { RunBudgetGroupId } from '../../../common/run_quotas';
import type { SignificantEventsServer } from '../../types';
import { resolveDailyWindow, resolveMonthStart } from '../run_quotas/window';
import {
  InferenceServiceMapService,
  type InferenceServiceMapResult,
} from './inference_service_map';
import { InferencePriceService, type PriceServiceResult } from './price_service';
import {
  createCostTrackingAuditRepository,
  createSpaceTrackingAccess,
  getSpaceTrackingCoverage,
  type SpaceTrackingCoverage,
} from './space_coverage';
import { readCostTrackingAudit } from './tracking_audit';
import { aggregateSignificantEventsTokenCost, type CostPeriod } from './cost_service';
import { getWorkflowAttribution } from './workflow_attribution';

const COST_RESULT_CACHE_TTL_MS = 60_000;

export type { CostPeriodResult, SignificantEventsCostResponse };

interface CostLoadParams {
  request: KibanaRequest;
  server: SignificantEventsServer;
  currentSpaceId: string;
  now: Date;
}

type CostLoader = (params: CostLoadParams) => Promise<SignificantEventsCostResponse>;

interface CostReferenceData {
  priceResult: PriceServiceResult;
  priceUnavailable: boolean;
  serviceMapResult: InferenceServiceMapResult;
  serviceMapUnavailable: boolean;
  audit: Awaited<ReturnType<typeof readCostTrackingAudit>>;
  auditUnavailable: boolean;
}

const createEmptyPriceResult = (now: Date): PriceServiceResult => ({
  catalog: {
    pricesByModel: new Map(),
    effectiveAt: now.toISOString(),
    currency: {
      code: 'USD',
      symbol: '$',
      assumed: true,
      unit: '1M Token',
    },
  },
  fetchedAt: '',
  stale: false,
});

const createEmptyServiceMapResult = (now: Date): InferenceServiceMapResult => ({
  serviceMap: new Map(),
  fetchedAt: now.toISOString(),
  stale: false,
});

export const loadCostReferenceData = async ({
  getPrices,
  getServiceMap,
  getAudit,
  now,
  logger,
}: {
  getPrices: () => Promise<PriceServiceResult>;
  getServiceMap: () => Promise<InferenceServiceMapResult>;
  getAudit: () => Promise<Awaited<ReturnType<typeof readCostTrackingAudit>>>;
  now: Date;
  logger: Pick<Logger, 'warn'>;
}): Promise<CostReferenceData> => {
  const [serviceMapSettled, auditSettled] = await Promise.allSettled([getServiceMap(), getAudit()]);
  const serviceMapUnavailable = serviceMapSettled.status === 'rejected';
  const serviceMapResult =
    serviceMapSettled.status === 'fulfilled'
      ? serviceMapSettled.value
      : createEmptyServiceMapResult(now);
  if (serviceMapSettled.status === 'rejected') {
    logger.warn(
      `Inference endpoint map is unavailable; cost figures will be unavailable: ${
        serviceMapSettled.reason instanceof Error
          ? serviceMapSettled.reason.message
          : String(serviceMapSettled.reason)
      }`
    );
  }

  const auditUnavailable = auditSettled.status === 'rejected';
  const audit = auditSettled.status === 'fulfilled' ? auditSettled.value : undefined;
  if (auditSettled.status === 'rejected') {
    logger.warn(
      `Cost tracking audit is unavailable; coverage will be unverified: ${
        auditSettled.reason instanceof Error
          ? auditSettled.reason.message
          : String(auditSettled.reason)
      }`
    );
  }

  const hasPriceableEndpoint =
    !serviceMapUnavailable &&
    [...serviceMapResult.serviceMap.values()].some(({ priceable }) => priceable);
  if (!hasPriceableEndpoint) {
    return {
      priceResult: createEmptyPriceResult(now),
      priceUnavailable: false,
      serviceMapResult,
      serviceMapUnavailable,
      audit,
      auditUnavailable,
    };
  }

  try {
    return {
      priceResult: await getPrices(),
      priceUnavailable: false,
      serviceMapResult,
      serviceMapUnavailable,
      audit,
      auditUnavailable,
    };
  } catch (error) {
    logger.warn(
      `Inference prices are unavailable; cost figures will be unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      priceResult: createEmptyPriceResult(now),
      priceUnavailable: true,
      serviceMapResult,
      serviceMapUnavailable,
      audit,
      auditUnavailable,
    };
  }
};

const createUnavailableWorkflowGroup = (
  group: RunBudgetGroupId
): GroupWorkflowAttributionResponse => ({
  group,
  status: group === 'ki_extraction' ? 'not_attributable' : 'attributed',
  tokens: { prompt: 0, cached: 0, completion: 0, thinking: 0 },
  estimatedCost: null,
  coverage: 'unavailable',
  workflows: [],
  unpricedConnectorIds: [],
  reconciliationRatio: null,
  inconsistent: false,
  otherPathsTokens: 0,
  otherPathsEstimatedCost: null,
});

const createUnavailableWorkflowAttribution = (): CostPeriodResult['workflowAttribution'] => ({
  source: 'workflow_step_usage',
  groups: {
    detection: createUnavailableWorkflowGroup('detection'),
    investigation: createUnavailableWorkflowGroup('investigation'),
    ki_extraction: createUnavailableWorkflowGroup('ki_extraction'),
    memory: createUnavailableWorkflowGroup('memory'),
  },
  trackingGaps: [],
});

const loadPeriod = async ({
  period,
  server,
  priceResult,
  priceUnavailable,
  serviceMapResult,
  serviceMapUnavailable,
  spaceCoverage,
  audit,
  logger,
}: {
  period: CostPeriod;
  server: SignificantEventsServer;
  priceResult: PriceServiceResult;
  priceUnavailable: boolean;
  serviceMapResult: InferenceServiceMapResult;
  serviceMapUnavailable: boolean;
  spaceCoverage: SpaceTrackingCoverage;
  audit: Awaited<ReturnType<typeof readCostTrackingAudit>>;
  logger: Pick<Logger, 'error' | 'warn'>;
}): Promise<CostPeriodResult> => {
  const esClient = server.core.elasticsearch.client.asInternalUser;
  const tokenIndex = await aggregateSignificantEventsTokenCost({
    esClient,
    priceResult,
    priceUnavailable,
    serviceMap: serviceMapResult.serviceMap,
    serviceMapStale: serviceMapResult.stale,
    serviceMapUnavailable,
    spaceCoverage,
    period,
    logger,
  });
  if (spaceCoverage.currentSpaceTracking !== 'enabled') {
    return {
      tokenIndex,
      workflowAttribution: createUnavailableWorkflowAttribution(),
    };
  }
  const workflowAttribution = await getWorkflowAttribution({
    esClient,
    priceResult,
    priceUnavailable,
    serviceMap: serviceMapResult.serviceMap,
    serviceMapStale: serviceMapResult.stale,
    serviceMapUnavailable,
    tokenIndex,
    period,
    audit,
    currentSpaceIds: spaceCoverage.spaces.map(({ id }) => id),
  });
  return { tokenIndex, workflowAttribution };
};

export class SignificantEventsCostService {
  private readonly priceService: InferencePriceService;
  private readonly serviceMapService: InferenceServiceMapService;
  private readonly load: CostLoader;
  private readonly now: () => number;
  private readonly resultCacheTtlMs: number;
  private readonly cache = new Map<
    string,
    { response: SignificantEventsCostResponse; loadedAt: number }
  >();
  private readonly inFlight = new Map<string, Promise<SignificantEventsCostResponse>>();
  private cacheGeneration = 0;

  constructor({
    logger,
    cloudBaseUrl,
    now = Date.now,
    resultCacheTtlMs = COST_RESULT_CACHE_TTL_MS,
    load,
  }: {
    logger: Logger;
    cloudBaseUrl?: string;
    now?: () => number;
    resultCacheTtlMs?: number;
    load?: CostLoader;
  }) {
    this.priceService = new InferencePriceService({
      logger,
      cloudBaseUrl,
      now,
    });
    this.serviceMapService = new InferenceServiceMapService(logger, now);
    this.now = now;
    this.resultCacheTtlMs = resultCacheTtlMs;
    this.load = load ?? this.loadFromSources.bind(this, logger);
  }

  public async getCost({
    request,
    server,
    currentSpaceId,
  }: Omit<CostLoadParams, 'now'>): Promise<SignificantEventsCostResponse> {
    const loadedAt = this.now();
    const cached = this.cache.get(currentSpaceId);
    if (cached && loadedAt - cached.loadedAt < this.resultCacheTtlMs) {
      return cached.response;
    }
    const existing = this.inFlight.get(currentSpaceId);
    if (existing) {
      return existing;
    }
    const cacheGeneration = this.cacheGeneration;
    const pending = this.load({
      request,
      server,
      currentSpaceId,
      now: new Date(loadedAt),
    }).then((response) => {
      if (cacheGeneration === this.cacheGeneration) {
        this.cache.set(currentSpaceId, { response, loadedAt });
      }
      return response;
    });
    this.inFlight.set(currentSpaceId, pending);
    const clearInFlight = () => {
      if (this.inFlight.get(currentSpaceId) === pending) {
        this.inFlight.delete(currentSpaceId);
      }
    };
    void pending.then(clearInFlight, clearInFlight);
    return pending;
  }

  public invalidate(): void {
    this.cacheGeneration += 1;
    this.cache.clear();
    this.inFlight.clear();
  }

  private async loadFromSources(
    logger: Logger,
    { request, server, currentSpaceId, now }: CostLoadParams
  ): Promise<SignificantEventsCostResponse> {
    const access = createSpaceTrackingAccess({
      coreStart: server.core,
      spaces: server.spaces,
      request,
    });
    const auditRepository = createCostTrackingAuditRepository(server.core);
    const {
      priceResult,
      priceUnavailable,
      serviceMapResult,
      serviceMapUnavailable,
      audit,
      auditUnavailable,
    } = await loadCostReferenceData({
      getPrices: () => this.priceService.getPrices(),
      getServiceMap: () =>
        this.serviceMapService.getServiceMap(server.core.elasticsearch.client.asInternalUser),
      getAudit: () => readCostTrackingAudit(auditRepository),
      now,
      logger,
    });
    const spaceCoverage = await getSpaceTrackingCoverage({
      access,
      audit,
      auditUnavailable,
      currentSpaceId,
      logger,
    });
    const dailyWindow = resolveDailyWindow(now);
    const end = now.toISOString();
    const todayPeriod: CostPeriod = {
      kind: 'today',
      start: dailyWindow.start,
      end,
    };
    const monthPeriod: CostPeriod = {
      kind: 'month',
      start: resolveMonthStart(now),
      end,
    };
    const [today, month] = await Promise.all(
      [todayPeriod, monthPeriod].map((period) =>
        loadPeriod({
          period,
          server,
          priceResult,
          priceUnavailable,
          serviceMapResult,
          serviceMapUnavailable,
          spaceCoverage,
          audit,
          logger,
        })
      )
    );

    return {
      asOf: end,
      spaceCoverage,
      today,
      month,
      interactiveAgentChatsExcluded: true,
    };
  }
}
