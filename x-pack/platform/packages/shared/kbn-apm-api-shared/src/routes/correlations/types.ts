/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

export const entityTypeSchema = z.enum(['transaction', 'exit_span']);

export const metricSchema = z.enum(['latency', 'failure_rate', 'throughput', 'infra_metrics']);
