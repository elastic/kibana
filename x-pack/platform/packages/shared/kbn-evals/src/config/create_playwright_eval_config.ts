/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestOptions, createPlaywrightConfig } from '@kbn/scout';
import { PlaywrightTestConfig, defineConfig } from '@playwright/test';
import { AvailableConnectorWithId, getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import { getFlags } from '@kbn/dev-cli-runner';
import {
  ToolingLog,
  pickLevelFromFlags,
  LOG_LEVEL_FLAGS,
  DEFAULT_LOG_LEVEL,
} from '@kbn/tooling-log';

export interface EvaluationTestOptions extends ScoutTestOptions {
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
}

/**
 * Exports a Playwright configuration specifically for offline evals
 */
export function createPlaywrightEvalsConfig({
  testDir,
}: {
  testDir: string;
}): PlaywrightTestConfig<{}, EvaluationTestOptions> {
  const flags = getFlags(process.argv);

  function getDefaultLogLevel() {
    const env = process.env.LOG_LEVEL;
    const found = LOG_LEVEL_FLAGS.find(({ name }) => name === env);

    if (found) {
      return found.name === 'quiet' ? 'silent' : found.name;
    }
    return DEFAULT_LOG_LEVEL;
  }

  const log = new ToolingLog({
    level: pickLevelFromFlags(flags, { default: getDefaultLogLevel() }),
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
    timeout: 5 * 60_000,
  });
}
