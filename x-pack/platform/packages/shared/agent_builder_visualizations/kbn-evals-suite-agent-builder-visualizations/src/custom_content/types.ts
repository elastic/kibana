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
    /**
     * Exact `LIMIT` the panel's queries must end with: a number for one query, a list for several,
     * each matched to a different query whatever its position. A query that matches none must not
     * use the chart default of 10. When omitted, only that default is rejected.
     */
    limit?: number | number[];
    /** How many queries the panel ends up with: an exact number, or a lower bound. */
    queryCount?: number | { min: number };
    /** Where the panel must be stored. When omitted, either is fine. */
    storedIn?: 'visualization' | 'dashboard';
    /** Labels the executed query must return as rows, in this order (for example funnel steps). */
    rowOrder?: string[];
    /** `style` keeps the query and changes the template; `data` changes the query. */
    edit?: 'style' | 'data';
    /** The measure a data edit adds, as it is written in the query, which the template must then show. */
    addsMeasure?: string;
    /** Text the final queries must contain, ignoring case and whitespace, in any of them. */
    queryContains?: string[];
    /** Positions of the queries a data edit must leave exactly as they were. */
    unchangedQueries?: number[];
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
