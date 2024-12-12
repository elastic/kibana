/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { DEFAULTS } from '../constants';
import { DatasetRT, PartialConfig, Schedule, CliOptions } from '../types';

export function cliOptionsToPartialConfig(options: CliOptions) {
  const schedule: Schedule = {
    template: options.eventTemplate,
    start: options.lookback,
    end: options.scheduleEnd ?? false,
  };

  const decodedDataset = DatasetRT.decode(options.dataset);
  if (isLeft(decodedDataset)) {
    throw new Error(
      `Could not validate "DATASET": ${PathReporter.report(decodedDataset).join('\n')}`
    );
  }

  const config: PartialConfig = {
    elasticsearch: {
      host: options.elasticsearchHost,
      username: options.elasticsearchUsername,
      password: options.elasticsearchPassword,
      installKibanaUser: DEFAULTS.SKIP_KIBANA_USER,
      apiKey: options.elasticsearchApiKey || '',
    },
    kibana: {
      host: options.kibanaUrl,
      username: options.kibanaUsername,
      password: options.kibanaPassword,
      installAssets: !!options.installKibanaAssets,
    },
    indexing: {
      dataset: decodedDataset.right,
      scenario: options.scenario,
      interval: options.indexInterval,
      eventsPerCycle: options.eventsPerCycle,
      payloadSize: options.payloadSize,
      concurrency: options.concurrency,
      reduceWeekendTrafficBy: options.reduceWeekendTrafficBy,
      ephemeralProjectIds: options.ephemeralProjectIds,
      alignEventsToInterval: options.alignEventsToInterval === true,
    },
    schedule: [schedule],
  };

  return config;
}
