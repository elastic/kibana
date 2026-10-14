/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { categoricalQuery, partitionExample, withDataSource } from './factories';

const INDEX = 'kibana_sample_data_flights';
const TIME_FIELD = 'timestamp';
const FLIGHT_COUNT = { alias: 'Flight Count', expression: 'COUNT(*)' };

/** kibana_sample_data_flights: its event time is `timestamp`, not `@timestamp`. */
export const FLIGHTS_EXAMPLES: VisualizationDatasetExample[] = withDataSource('flights', [
  partitionExample({
    question: 'Create a pie chart of flight counts by carrier in kibana_sample_data_flights.',
    type: 'pie',
    query: categoricalQuery({
      index: INDEX,
      metrics: [FLIGHT_COUNT],
      groupBy: 'Carrier',
      timeField: TIME_FIELD,
    }),
    metrics: [FLIGHT_COUNT.alias],
    groupBy: ['Carrier'],
  }),
]);
