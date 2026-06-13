/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates unstructured log messages from different sources like Java and web servers.
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { IndexTemplateName } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { getJavaLogs, getWebLogs } from './helpers/logs_mock_data';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);
  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return [
            ...getJavaLogs().map((message) =>
              log.create({ isLogsDb }).dataset('java').message(message).timestamp(timestamp)
            ),
            ...getWebLogs().map((message) =>
              log.create({ isLogsDb }).dataset('web').message(message).timestamp(timestamp)
            ),
          ];
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => logs)
      );
    },
  };
};

export default scenario;
