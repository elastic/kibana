/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestOptions, createPlaywrightConfig } from '@kbn/scout';
import { PlaywrightTestConfig, defineConfig } from '@playwright/test';
import { AvailableConnectorWithId, getAvailableConnectors } from '@kbn/gen-ai-functional-testing';

export interface EvaluationTestOptions extends ScoutTestOptions {
  connector: AvailableConnectorWithId;
}

/**
 * Exports a Playwright configuration specifically for offline evals
 */
export function createPlaywrightEvalsConfig({
  testDir,
}: {
  testDir: string;
}): PlaywrightTestConfig<{}, EvaluationTestOptions> {
  const { reporter, use, outputDir, projects, ...config } = createPlaywrightConfig({ testDir });

  // gets the connectors from either the env variable or kibana.yml/kibana.dev.yml
  const connectors = getAvailableConnectors();

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
