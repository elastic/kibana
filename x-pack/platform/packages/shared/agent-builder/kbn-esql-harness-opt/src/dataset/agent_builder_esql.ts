/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The three analytical examples from `@kbn/evals-suite-agent-builder`'s `esql.spec.ts`, with the
 * target index stated explicitly (the spec relies on index discovery; here the index is pinned so
 * a harness change is measured against query generation rather than against discovery noise).
 */
export const agentBuilderEsqlExamples: Array<{
  question: string;
  goldQuery: string;
  index?: string;
}> = [
  {
    question: 'When did tina.jackson@gray-smith.com signup',
    index: 'users',
    goldQuery: `FROM users
| WHERE email == "tina.jackson@gray-smith.com"
| KEEP created_at`,
  },
  {
    question: 'What is the id of the project that was deleted most recently',
    index: 'projects',
    goldQuery: `FROM projects
| WHERE deleted_at IS NOT NULL
| SORT deleted_at DESC
| LIMIT 1
| KEEP id, deleted_at`,
  },
  {
    question:
      'What is the id of the project with highest daily average error count between Jun 2024 to Dec 2024',
    index: 'error_rate_daily',
    goldQuery: `FROM error_rate_daily
| WHERE date >= "2024-06-01" AND date <= "2024-12-31"
| STATS avg_daily_errors = AVG(error_count) BY project_id
| SORT avg_daily_errors DESC
| LIMIT 1
| KEEP project_id`,
  },
];
