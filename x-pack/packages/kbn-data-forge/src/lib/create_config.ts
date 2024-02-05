/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { promises } from 'fs';
import yaml from 'js-yaml';
import { Config, ConfigRT, DatasetRT, Schedule, PartialConfig, PartialConfigRT } from '../types';
import { DEFAULTS } from '../constants';

export async function readConfig(filePath: string): Promise<PartialConfig> {
  const data = await promises.readFile(filePath);
  const decodedPartialConfig = PartialConfigRT.decode(yaml.load(data.toString()));
  if (isLeft(decodedPartialConfig)) {
    throw new Error(
      `Could not validate config: ${PathReporter.report(decodedPartialConfig).join('\n')}`
    );
  }
  return decodedPartialConfig.right;
}

export function createConfig(partialConfig: PartialConfig = {}) {
  const schedule: Schedule = {
    template: DEFAULTS.EVENT_TEMPLATE,
    start: DEFAULTS.LOOKBACK || 'now',
    end: false,
  };

  const decodedDataset = DatasetRT.decode(DEFAULTS.DATASET);
  if (isLeft(decodedDataset)) {
    throw new Error(
      `Could not validate "DATASET": ${PathReporter.report(decodedDataset).join('\n')}`
    );
  }

  const config: Config = {
    elasticsearch: {
      host: DEFAULTS.ELASTICSEARCH_HOST,
      username: DEFAULTS.ELASTICSEARCH_USERNAME,
      password: DEFAULTS.ELASTICSEARCH_PASSWORD,
      installKibanaUser: false,
      apiKey: DEFAULTS.ELASTICSEARCH_API_KEY,
      ...(partialConfig.elasticsearch ?? {}),
    },
    kibana: {
      host: DEFAULTS.KIBANA_URL,
      username: DEFAULTS.KIBANA_USERNAME,
      password: DEFAULTS.KIBANA_PASSWORD,
      installAssets: DEFAULTS.INSTALL_KIBANA_ASSETS,
      ...(partialConfig.kibana ?? {}),
    },
    indexing: {
      dataset: decodedDataset.right,
      scenario: DEFAULTS.SCENARIO,
      interval: DEFAULTS.INDEX_INTERVAL,
      eventsPerCycle: DEFAULTS.EVENTS_PER_CYCLE,
      payloadSize: DEFAULTS.PAYLOAD_SIZE,
      concurrency: DEFAULTS.CONCURRENCY,
      reduceWeekendTrafficBy: DEFAULTS.REDUCE_WEEKEND_TRAFFIC_BY,
      ephemeralProjectIds: DEFAULTS.EPHEMERAL_PROJECT_IDS,
      alignEventsToInterval: DEFAULTS.ALIGN_EVENTS_TO_INTERVAL === 1,
      ...(partialConfig.indexing ?? {}),
    },
    schedule: partialConfig.schedule ?? [schedule],
  };

  const decodedConfig = ConfigRT.decode(config);
  if (isLeft(decodedConfig)) {
    throw new Error(`Could not validate config: ${PathReporter.report(decodedConfig).join('\n')}`);
  }

  return decodedConfig.right;
}
