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
import { createServer } from 'net';

const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';
// Store in repo root target/ directory (standard CI artifact location)
const OUTPUT_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

const DEFAULT_TEST_ES_PORT = process.env.TEST_ES_PORT
  ? parseInt(process.env.TEST_ES_PORT, 10)
  : 9220;
const MAX_TEST_ES_PORT_INCREMENTS = 20;

const isPortAvailable = async (port: number): Promise<boolean> => {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolvePort(false);
        return;
      }
      reject(error);
    });

    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolvePort(true));
    });
  });
};

const getTestEsPort = async (log: { warning: (msg: string) => void }): Promise<number> => {
  if (Number.isNaN(DEFAULT_TEST_ES_PORT)) {
    throw new Error(
      `process.env.TEST_ES_PORT must contain a valid port. given: ${process.env.TEST_ES_PORT}`
    );
  }

  for (let offset = 0; offset <= MAX_TEST_ES_PORT_INCREMENTS; offset++) {
    const port = DEFAULT_TEST_ES_PORT + offset;
    const available = await isPortAvailable(port);
    if (available) {
      if (offset > 0) {
        log.warning(
          `TEST_ES_PORT=${DEFAULT_TEST_ES_PORT} is in use; using port ${port} for temporary Elasticsearch`
        );
      }
      return port;
    }
  }

  throw new Error(
    `Unable to find an available Elasticsearch port in range ${DEFAULT_TEST_ES_PORT}..${
      DEFAULT_TEST_ES_PORT + MAX_TEST_ES_PORT_INCREMENTS
    }`
  );
};

interface EisInferenceEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: {
    model_id?: string;
  };
  metadata?: {
    heuristics?: {
      properties?: string[];
    };
  };
}

interface DiscoveredModel {
  inferenceId: string;
  modelId: string;
  metadata?: {
    heuristics?: {
      properties?: string[];
    };
  };
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
    const port = await getTestEsPort(log);
    const cluster = createTestEsCluster({
      log,
      license: 'trial',
      port,
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
            metadata: ep.metadata
              ? { heuristics: { properties: ep.metadata.heuristics?.properties } }
              : undefined,
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
