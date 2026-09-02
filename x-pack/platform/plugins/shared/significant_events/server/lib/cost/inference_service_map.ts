/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';

const SERVICE_MAP_CACHE_TTL_MS = 6 * 60 * 60_000;

export interface InferenceServiceMapEntry {
  service: string;
  model?: string;
  priceable: boolean;
}

export type InferenceServiceMap = ReadonlyMap<string, InferenceServiceMapEntry>;

export interface InferenceServiceMapResult {
  serviceMap: InferenceServiceMap;
  fetchedAt: string;
  stale: boolean;
}

const getModelId = (serviceSettings: unknown): string | undefined => {
  if (
    typeof serviceSettings !== 'object' ||
    serviceSettings === null ||
    !('model_id' in serviceSettings)
  ) {
    return undefined;
  }
  const modelId = serviceSettings.model_id;
  return typeof modelId === 'string' && modelId.length > 0 ? modelId : undefined;
};

export const fetchInferenceServiceMap = async (
  esClient: ElasticsearchClient
): Promise<InferenceServiceMap> => {
  const { endpoints } = await esClient.inference.get({ inference_id: '_all' });
  const serviceMap = new Map<string, InferenceServiceMapEntry>();

  for (const endpoint of endpoints) {
    if (serviceMap.has(endpoint.inference_id)) {
      throw new Error(`Duplicate inference endpoint id "${endpoint.inference_id}"`);
    }
    const model = getModelId(endpoint.service_settings);
    serviceMap.set(endpoint.inference_id, {
      service: endpoint.service,
      model,
      priceable: endpoint.service === 'elastic' && model !== undefined,
    });
  }

  return serviceMap;
};

export class InferenceServiceMapService {
  private cached?: { serviceMap: InferenceServiceMap; fetchedAtMs: number };
  private refreshPromise?: Promise<InferenceServiceMapResult>;

  constructor(
    private readonly logger: Pick<Logger, 'warn'>,
    private readonly now: () => number = Date.now,
    private readonly cacheTtlMs: number = SERVICE_MAP_CACHE_TTL_MS
  ) {}

  public async getServiceMap(esClient: ElasticsearchClient): Promise<InferenceServiceMapResult> {
    const now = this.now();
    if (this.cached && now - this.cached.fetchedAtMs < this.cacheTtlMs) {
      return this.toResult(this.cached, false);
    }
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = this.refresh(esClient).finally(() => {
      this.refreshPromise = undefined;
    });
    return this.refreshPromise;
  }

  private async refresh(esClient: ElasticsearchClient): Promise<InferenceServiceMapResult> {
    try {
      const serviceMap = await fetchInferenceServiceMap(esClient);
      this.cached = { serviceMap, fetchedAtMs: this.now() };
      return this.toResult(this.cached, false);
    } catch (error) {
      if (!this.cached) {
        throw error;
      }
      this.logger.warn(
        `Inference endpoint refresh failed; using stale service map: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return this.toResult(this.cached, true);
    }
  }

  private toResult(
    cached: { serviceMap: InferenceServiceMap; fetchedAtMs: number },
    stale: boolean
  ): InferenceServiceMapResult {
    return {
      serviceMap: cached.serviceMap,
      fetchedAt: new Date(cached.fetchedAtMs).toISOString(),
      stale,
    };
  }
}
