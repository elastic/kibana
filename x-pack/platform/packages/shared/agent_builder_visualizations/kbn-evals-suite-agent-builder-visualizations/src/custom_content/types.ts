/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example } from '@kbn/evals';
import type { CustomContentTaskOutput } from './custom_content_output';

export type CustomContentDatasetExample = Example<
  {
    question: string;
    /** Second turn in the same conversation; evaluators compare the panel before and after it. */
    followUp?: string;
  },
  {
    /** Whether the panel ends up with live data (a query) or is static (no query). */
    data: 'static' | 'query';
    /** Exact `LIMIT` the query must end with. When omitted, only the chart default of 10 is rejected. */
    limit?: number;
    /** Labels the executed query must return as rows, in this order (for example funnel steps). */
    rowOrder?: string[];
    /** `style` keeps the query and changes the template; `data` changes the query. */
    edit?: 'style' | 'data';
    /** The measure a data edit adds, as it is written in the query, which the template must then show. */
    addsMeasure?: string;
    /** Text the final query must contain, ignoring case and whitespace. */
    queryContains?: string[];
  },
  {
    agentId?: string;
    [key: string]: unknown;
  }
>;

export type CustomContentEvaluator = Evaluator<
  CustomContentDatasetExample,
  CustomContentTaskOutput
>;
