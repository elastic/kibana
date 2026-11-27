/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example } from '@kbn/evals';

export type RoutingExample = Example<
  { question: string },
  {
    /** `custom_content` when only an HTML panel can express the request, `vis` when a chart can. */
    panelType: 'custom_content' | 'vis';
  },
  { [key: string]: unknown }
>;

export interface RoutingTaskOutput {
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  /** Panel types the agent asked for, in order, whichever tool it used. */
  panelTypes: string[];
  toolIds: string[];
  agentTraceId?: string;
  traceId?: string;
  prompts: unknown[];
}

export type RoutingEvaluator = Evaluator<RoutingExample, RoutingTaskOutput>;
