/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestOptions } from '@kbn/scout';
import { createPlaywrightConfig } from '@kbn/scout';
import type { PlaywrightTestConfig } from '@playwright/test';
import { defineConfig } from '@playwright/test';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import { ToolingLog, LOG_LEVEL_FLAGS, DEFAULT_LOG_LEVEL } from '@kbn/tooling-log';

export interface EvaluationTestOptions extends ScoutTestOptions {
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  timeout?: number;
}

function getLogLevel() {
  const env = process.env.LOG_LEVEL;
  const found = LOG_LEVEL_FLAGS.find(({ name }) => name === env);

  if (found) {
    return found.name === 'quiet' ? 'error' : found.name;
  }
  return DEFAULT_LOG_LEVEL;
}
/**
 * Exports a Playwright configuration specifically for offline evals
 */
export function createPlaywrightEvalsConfig({
  testDir,
  repetitions,
  timeout,
}: {
  testDir: string;
  repetitions?: number;
  timeout?: number;
}): PlaywrightTestConfig<{}, EvaluationTestOptions> {
  const log = new ToolingLog({
    level: getLogLevel(),
    writeTo: process.stdout,
  });

  const { reporter, use, outputDir, projects, ...config } = createPlaywrightConfig({ testDir });

  // gets the connectors from either the env variable or kibana.yml/kibana.dev.yml
  const connectors = getAvailableConnectors();

  let evaluationConnectorId = process.env.EVALUATION_CONNECTOR_ID
    ? String(process.env.EVALUATION_CONNECTOR_ID)
    : undefined;

  if (!evaluationConnectorId) {
    evaluationConnectorId = connectors[0].id;
    log.warning(
      `process.env.EVALUATION_CONNECTOR_ID not set, defaulting to ${evaluationConnectorId}. Please set this for consistent results.`
    );
    process.env.EVALUATION_CONNECTOR_ID = evaluationConnectorId;
  }

  const evaluationConnector = connectors.find(
    (connector) => connector.id === evaluationConnectorId
  );

  if (!evaluationConnector) {
    throw new Error(
      `Evaluation connector id ${evaluationConnectorId} was not found, pick one from ${connectors
        .map((connector) => connector.id)
        .join(', ')}`
    );
  }

  // Priority of determining repetition number: env variable, config parameter, default
  const experimentRepetitions =
    parseInt(process.env.EVALUATION_REPETITIONS || '', 10) || repetitions || 1;

  // get just the 'local' project (for now)
  const nextProjects = connectors.flatMap((connector) => {
    return (
      projects
        ?.filter((project) => project.name === 'local')
        .map((project) => {
          return {
            ...project,
            name: connector.id,
            use: {
              ...project.use,
              connector,
              evaluationConnector,
              repetitions: experimentRepetitions,
            },
          };
        }) ?? []
    );
  });

  return defineConfig<{}, EvaluationTestOptions>({
    ...config,
    // some reports write to disk, which we don't need
    reporter: Array.isArray(reporter)
      ? reporter.filter(([name]) => {
          return name !== 'html' && name !== 'json';
        })
      : reporter,
    use: {
      serversConfigDir: (use as ScoutTestOptions).serversConfigDir,
    },
    projects: nextProjects,
    globalSetup: require.resolve('./setup.js'),
    timeout: timeout ?? 5 * 60_000,
  });
}
