/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Metric } from './classes/metric';
import { metrics as elasticsearchMetrics } from './elasticsearch/metrics';
import { metrics as kibanaMetrics } from './kibana/metrics';
import { metrics as logstashMetrics } from './logstash/metrics';
import { metrics as beatsMetrics } from './beats/metrics';
import { metrics as apmMetrics } from './apm/metrics';
import { metrics as entSearchMetrics } from './enterprise_search/metrics';

export type { Metric } from './classes/metric';

export const metrics: { [key: string]: Metric } = {
  ...elasticsearchMetrics,
  ...kibanaMetrics,
  ...logstashMetrics,
  ...beatsMetrics,
  ...apmMetrics,
  ...entSearchMetrics,
};
