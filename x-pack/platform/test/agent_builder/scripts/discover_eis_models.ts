/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pre-discovery script for EIS models.
 *
 * This script starts a temporary Elasticsearch instance with EIS connectivity,
 * enables CCM, discovers available chat completion models, and writes them to JSON.
 *
 * Usage:
 *   export KIBANA_EIS_CCM_API_KEY="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"
 *   node scripts/discover_eis_models.js
 *
 * The output file (target/eis_models.json) is read by FTR tests.
 */

import { run } from '@kbn/dev-cli-runner';
import { createTestEsCluster } from '@kbn/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';
// Store in repo root target/ directory (standard CI artifact location)
const OUTPUT_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

interface EisInferenceEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: {
    model_id?: string;
  };
}

interface DiscoveredModel {
  inferenceId: string;
  modelId: string;
}

run(
  async ({ log, flags }) => {
    const apiKey = process.env[EIS_CCM_API_KEY_ENV];

    if (!apiKey) {
      log.warning(`${EIS_CCM_API_KEY_ENV} not set - writing empty models file`);
      log.info(
        `For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`
      );
      mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
      writeFileSync(OUTPUT_PATH, JSON.stringify({ models: [] }, null, 2));
      log.info(`Wrote empty models to ${OUTPUT_PATH}`);
      return;
    }

    // Start a temporary ES cluster with EIS URL configured
    log.info('Starting temporary Elasticsearch with EIS config...');
    const cluster = createTestEsCluster({
      log,
      license: 'trial',
      esArgs: [`xpack.inference.elastic.url=${EIS_QA_URL}`],
    });

    try {
      await cluster.start();
      log.info('✅ Elasticsearch started');

      const es = cluster.getClient();

      // Enable CCM
      log.info('Enabling Cloud Connected Mode...');
      await es.transport.request({
        method: 'PUT',
        path: '/_inference/_ccm',
        body: { api_key: apiKey },
      });
      log.info('✅ CCM enabled');

      // Discover models with retry (EIS needs time to provision endpoints)
      log.info('Discovering EIS inference endpoints...');
      let models: DiscoveredModel[] = [];
      const maxRetries = Number(flags.retries) || 5;
      const retryDelayMs = 3000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const response = await es.inference.get({ inference_id: '_all' });
        const endpoints = response.endpoints as EisInferenceEndpoint[];

        models = endpoints
          .filter((ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic')
          .map((ep) => ({
            inferenceId: ep.inference_id,
            modelId: ep.service_settings?.model_id || 'unknown',
          }));

        if (models.length > 0) {
          log.info(`Found ${models.length} EIS models on attempt ${attempt}`);
          break;
        }

        if (attempt < maxRetries) {
          log.info(
            `No models found (attempt ${attempt}/${maxRetries}), waiting ${retryDelayMs}ms...`
          );
          await new Promise((r) => setTimeout(r, retryDelayMs));
        }
      }

      if (models.length === 0) {
        throw new Error('No EIS chat completion models discovered after all retries');
      }

      // Write output
      mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
      writeFileSync(OUTPUT_PATH, JSON.stringify({ models }, null, 2));
      log.info(`✅ Wrote ${models.length} models to ${OUTPUT_PATH}`);

      // Log discovered models
      if (models.length > 0) {
        log.info('Discovered models:');
        models.forEach((m, i) => log.info(`  ${i + 1}. ${m.modelId} (${m.inferenceId})`));
      }
    } finally {
      // Always stop ES
      log.info('Stopping Elasticsearch...');
      await cluster.cleanup();
      log.info('✅ Elasticsearch stopped');
    }
  },
  {
    description:
      'Discovers EIS chat completion models and writes them to target/eis_models.json for FTR tests',
    flags: {
      number: ['retries'],
      default: {
        retries: 5,
      },
      help: `
        --retries    Number of retry attempts for model discovery (default: 5)
      `,
    },
  }
);
