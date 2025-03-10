/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from 'commander';
import { FAKE_LOGS, FAKE_HOSTS, FAKE_STACK, DEFAULTS } from '../constants';
import { CliOptions } from '../types';

const parseCliInt = (value: string) => parseInt(value, 10);

export function parseCliOptions(): CliOptions {
  const program = new Command();
  program
    .name('data_forge.js')
    .description('A data generation tool that will create realistic data with different scenarios.')
    .option('--config <filepath>', 'The YAML config file')
    .option('--lookback <datemath>', 'When to start the indexing', DEFAULTS.LOOKBACK)
    .option(
      '--events-per-cycle <number>',
      'The number of events per cycle',
      parseCliInt,
      DEFAULTS.EVENTS_PER_CYCLE
    )
    .option('--payload-size <number>', 'The size of the ES bulk payload', DEFAULTS.PAYLOAD_SIZE)
    .option(
      '--concurrency <number>',
      'The number of concurrent connections to Elasticsearch',
      parseCliInt,
      DEFAULTS.CONCURRENCY
    )
    .option(
      '--index-interval <milliseconds>',
      'The interval of the data in milliseconds',
      parseCliInt,
      DEFAULTS.INDEX_INTERVAL
    )
    .option(
      '--dataset <dataset>',
      `The name of the dataset to use. Valid options: "${FAKE_LOGS}", "${FAKE_HOSTS}", "${FAKE_STACK}"`,
      DEFAULTS.DATASET
    )
    .option('--scenario <scenerio>', 'The scenario to label the events with', DEFAULTS.SCENARIO)
    .option(
      '--elasticsearch-host <address>',
      'The address to the Elasticsearch cluster',
      DEFAULTS.ELASTICSEARCH_HOST
    )
    .option(
      '--elasticsearch-username <username>',
      'The username to for the Elasticsearch cluster',
      DEFAULTS.ELASTICSEARCH_USERNAME
    )
    .option(
      '--elasticsearch-password <password>',
      'The password for the Elasticsearch cluster',
      DEFAULTS.ELASTICSEARCH_PASSWORD
    )
    .option('--elasticsearch-api-key <key>', 'The API key to connect to the Elasticsearch cluster')
    .option('--kibana-url <address>', 'The address to the Kibana server', DEFAULTS.KIBANA_URL)
    .option(
      '--kibana-username <username>',
      'The username for the Kibana server',
      DEFAULTS.KIBANA_USERNAME
    )
    .option(
      '--kibana-password <password>',
      'The password for the Kibana server',
      DEFAULTS.KIBANA_PASSWORD
    )
    .option(
      '--install-kibana-assets',
      'This will install index patterns, visualizations, and dashboards for the dataset'
    )
    .option(
      '--align-events-to-interval',
      'This will index all the events on the interval instead of randomly distributing them.'
    )
    .option(
      '--event-template <template>',
      'The name of the event template',
      DEFAULTS.EVENT_TEMPLATE
    )
    .option(
      '--reduce-weekend-traffic-by <ratio>',
      'This will reduce the traffic on the weekends by the specified amount. Example: 0.5 will reduce the traffic by half',
      parseFloat,
      DEFAULTS.REDUCE_WEEKEND_TRAFFIC_BY
    )
    .option(
      '--ephemeral-project-ids <number>',
      'The number of ephemeral projects to create. This is only enabled for the "fake_stack" dataset. It will create project IDs that will last 5 to 12 hours.',
      parseCliInt,
      DEFAULTS.EPHEMERAL_PROJECT_IDS
    );

  program.parse(process.argv);
  return program.opts() as CliOptions;
}
