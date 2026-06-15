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

export interface EvaluationTestOptions extends ScoutTestOptions {
  connector: AvailableConnectorWithId;
  evaluationConnector: AvailableConnectorWithId;
  repetitions: number;
  timeout?: number;
}

/**
 * Exports a Playwright configuration specifically for offline evals
 */
export function createPlaywrightEvalsConfig({
  testDir,
  testIgnore,
  repetitions,
  timeout,
  runGlobalSetup,
  singleProject,
}: {
  testDir: string;
  testIgnore?: PlaywrightTestConfig['testIgnore'];
  repetitions?: number;
  timeout?: number;
  runGlobalSetup?: boolean;
  /**
   * When true, creates a single Playwright project instead of one per available connector.
   * Use this for specs whose task ignores the project connector (e.g. workflow specs that
   * call the workflow API directly and have the model hardcoded in the workflow YAML).
   * The project is named after the evaluation connector.
   */
  singleProject?: boolean;
}): PlaywrightTestConfig<{}, EvaluationTestOptions> {
  const { reporter, use, outputDir, projects, ...config } = createPlaywrightConfig({
    testDir,
    runGlobalSetup,
  });

  // gets the connectors from either the env variable or kibana.yml/kibana.dev.yml
  const connectors = getAvailableConnectors();

  const evaluationConnectorId = process.env.EVALUATION_CONNECTOR_ID
    ? String(process.env.EVALUATION_CONNECTOR_ID)
    : undefined;

  if (!evaluationConnectorId) {
    throw new Error(
      `process.env.EVALUATION_CONNECTOR_ID is required. Pick one from ${connectors
        .map((connector) => connector.id)
        .join(', ')}`
    );
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

  // Pass through Scout's setup AND teardown hook projects unchanged. Scout's `setup-local`
  // references its teardown via Playwright's `teardown` field; dropping the `teardown-local`
  // project would leave a dangling reference and Playwright fails with "Project 'setup-local'
  // has unknown teardown project 'teardown-local'".
  const hookProjects =
    projects?.filter(
      (project) => project.name === 'setup-local' || project.name === 'teardown-local'
    ) ?? [];

  // get just the 'local' project (for now)
  // When singleProject is true, create one project instead of one per connector.
  // Used by specs whose task ignores the project connector (e.g. workflow specs).
  const projectConnectors = singleProject ? [evaluationConnector] : connectors;
  const nextProjects = projectConnectors.flatMap((connector) => {
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
    projects: [...hookProjects, ...nextProjects],
    globalSetup: require.resolve('./setup.js'),
    globalTeardown: require.resolve('./teardown.js'),
    timeout: timeout ?? 5 * 60_000,
    ...(testIgnore !== undefined ? { testIgnore } : {}),
  });
}
