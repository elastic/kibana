/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates a mix of well-formed and malformed (overly long fields) log documents.
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { log, generateShortId, generateLongId } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { IndexTemplateName } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';
import {
  getServiceName,
  getCluster,
  getCloudRegion,
  getCloudProvider,
  MORE_THAN_1024_CHARS,
  STACKTRACE_MESSAGE,
} from './helpers/logs_mock_data';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log', level: 'info' },
  {
    message: 'Another log message',
    level: 'debug',
  },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

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

      const constructLogsCommonData = () => {
        const index = Math.floor(Math.random() * 3);
        const serviceName = getServiceName(index);
        const logMessage = MESSAGE_LOG_LEVELS[index];
        const { clusterId, clusterName } = getCluster(index);
        const cloudRegion = getCloudRegion(index);

        const commonLongEntryFields: LogDocument = {
          'trace.id': generateLongId(),
          'agent.name': 'synth-agent',
          'orchestrator.cluster.name': clusterName,
          'orchestrator.cluster.id': clusterId,
          'orchestrator.resource.id': generateShortId(),
          'cloud.provider': getCloudProvider(),
          'cloud.region': cloudRegion,
          'cloud.availability_zone': `${cloudRegion}a`,
          'cloud.project.id': generateShortId(),
          'cloud.instance.id': generateShortId(),
          'log.file.path': `/logs/${generateLongId()}/error.txt`,
        };

        return {
          index,
          serviceName,
          logMessage,
          cloudRegion,
          commonLongEntryFields,
        };
      };

      const datasetSynth1Logs = (timestamp: number) => {
        const {
          serviceName,
          logMessage: { level, message },
          commonLongEntryFields,
        } = constructLogsCommonData();

        return log
          .create({ isLogsDb })
          .dataset('synth.1')
          .message(message)
          .logLevel(level)
          .service(serviceName)
          .defaults(commonLongEntryFields)
          .timestamp(timestamp);
      };

      const datasetSynth2Logs = (i: number, timestamp: number) => {
        const {
          serviceName,
          logMessage: { level, message },
          commonLongEntryFields,
        } = constructLogsCommonData();
        const isMalformed = i % 60 === 0;
        return log
          .create({ isLogsDb })
          .dataset('synth.2')
          .message(message)
          .logLevel(isMalformed ? MORE_THAN_1024_CHARS : level) // "ignore_above": 1024 in mapping
          .service(serviceName)
          .defaults(commonLongEntryFields)
          .timestamp(timestamp);
      };

      const datasetSynth3Logs = (i: number, timestamp: number) => {
        const {
          serviceName,
          logMessage: { level, message },
          cloudRegion,
          commonLongEntryFields,
        } = constructLogsCommonData();
        const isMalformed = i % 10 === 0;
        return log
          .create({ isLogsDb })
          .dataset('synth.3')
          .message(message)
          .logLevel(isMalformed ? MORE_THAN_1024_CHARS : level) // "ignore_above": 1024 in mapping
          .service(serviceName)
          .defaults({
            ...commonLongEntryFields,
            'cloud.availability_zone': isMalformed
              ? MORE_THAN_1024_CHARS // "ignore_above": 1024 in mapping
              : `${cloudRegion}a`,
            'error.stack_trace': isMalformed ? STACKTRACE_MESSAGE : undefined,
          })
          .timestamp(timestamp);
      };

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(200)
            .fill(0)
            .flatMap((_, index) => [
              datasetSynth1Logs(timestamp),
              datasetSynth2Logs(index, timestamp),
              datasetSynth3Logs(index, timestamp),
            ]);
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => logs)
      );
    },
  };
};

export default scenario;
