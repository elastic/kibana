/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout-specific EIS smoke helpers using stdout logging (Playwright has no ToolingLog).
 * See `@kbn/gen-ai-functional-testing` for the shared ToolingLog-based version.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import type { Client } from '@elastic/elasticsearch';
import { REPO_ROOT } from '@kbn/repo-info';

const EIS_MODELS_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

export interface DiscoveredEisModel {
  inferenceId: string;
  modelId: string;
  metadata?: {
    heuristics?: {
      properties?: string[];
    };
  };
}

export const getPreDiscoveredEisModelsForScout = (): DiscoveredEisModel[] => {
  if (!existsSync(EIS_MODELS_PATH)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(EIS_MODELS_PATH, 'utf8')) as {
      models?: DiscoveredEisModel[];
    };
    const models = data.models ?? [];
    return models.filter((model) => !model.metadata?.heuristics?.properties?.includes('efficient'));
  } catch {
    return [];
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Enables CCM on ES and waits for EIS endpoints (stdout logging for Playwright). */
export const enableCcmForScoutSmokeTests = async (es: Client, apiKey: string): Promise<void> => {
  process.stdout.write('[EIS] Enabling Cloud Connected Mode...\n');
  await es.transport.request({
    method: 'PUT',
    path: '/_inference/_ccm',
    body: { api_key: apiKey },
  });
  process.stdout.write('[EIS] ✅ CCM enabled\n');

  process.stdout.write('[EIS] Waiting for EIS endpoints to be provisioned...\n');
  const maxRetries = 5;
  const retryDelayMs = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await es.inference.get({ inference_id: '_all' });
    const endpoints = response.endpoints as Array<{ task_type: string; service: string }>;
    const eisEndpoints = endpoints.filter(
      (ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic'
    );

    if (eisEndpoints.length > 0) {
      process.stdout.write(
        `[EIS] ✅ Found ${eisEndpoints.length} EIS endpoints on attempt ${attempt}\n`
      );
      return;
    }
    if (attempt < maxRetries) {
      process.stdout.write(
        `[EIS] No endpoints yet (attempt ${attempt}/${maxRetries}), waiting...\n`
      );
      await sleep(retryDelayMs);
    }
  }

  process.stderr.write('[EIS] ⚠️ No EIS endpoints found after waiting\n');
};
