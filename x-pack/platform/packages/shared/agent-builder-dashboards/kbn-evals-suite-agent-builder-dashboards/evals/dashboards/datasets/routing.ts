/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardDatasetExample } from '../../../src/evaluate_dataset';
import { routingExample } from './factories';

/** Requests that must not become a dashboard. Cheap: nothing is generated. */
export const DASHBOARD_ROUTING_EXAMPLES: DashboardDatasetExample[] = [
  routingExample({
    question:
      'Create a bar chart showing the distribution of response codes in kibana_sample_data_logs.',
    route: 'visualization',
  }),
  routingExample({
    question: 'Help me write an ES|QL query to find slow transactions',
    route: 'none',
  }),
  routingExample({
    question: 'What fields are available in the logs-* index?',
    route: 'none',
  }),
];
