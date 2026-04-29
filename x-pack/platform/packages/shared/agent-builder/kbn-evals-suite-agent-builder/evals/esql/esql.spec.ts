/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import {
  type EsqlToolDatasetExample,
  type EvaluateEsqlToolDataset,
  createEvaluateEsqlToolDataset,
} from './esql_eval_common';

export type EvaluateDataset = EvaluateEsqlToolDataset;

const evaluate = base.extend<{ evaluateDataset: EvaluateEsqlToolDataset }, {}>({
  evaluateDataset: [
    async ({ chatClient, executorClient, inferenceClient, log }, use) => {
      await use(
        createEvaluateEsqlToolDataset({
          chatClient,
          executorClient,
          inferenceClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

/**
 * These examples target the internal synthetic indices `users`, `projects`, and
 * `error_rate_daily` (e.g. from the same AgentBuilder / WorkChat data load as `evals/kb/…`).
 * They are **not** created by Kibana "Add sample data" and **not** present on an empty
 * `scout` stack — load the team snapshot/ETL dataset (see this package `README`, "Load
 * AgentBuilder Datasets") or use the `kibana_sample_data` ES|QL eval for data you
 * can install locally. Tweak goldens if your snapshot uses different names.
 */
const ESQL_TOOL_SHOWCASE_EXAMPLES: EsqlToolDatasetExample[] = [
  {
    input: { question: 'When did tina.jackson@gray-smith.com signup' },
    output: {
      query: `FROM users
| WHERE email == "tina.jackson@gray-smith.com"
| KEEP created_at`,
    },
    metadata: {
      scenario_id: 'lookup_user_event_by_email',
      sample_dataset: 'synthetic',
      category: 'lookup',
      difficulty: 'easy',
      query_intent: 'Factual',
    },
  },
  {
    input: { question: 'What is the id of the project that was deleted most recently' },
    output: {
      query: `FROM projects
| WHERE deleted_at IS NOT NULL
| SORT deleted_at DESC
| LIMIT 1
| KEEP id, deleted_at`,
    },
    metadata: {
      scenario_id: 'latest_deleted_project',
      sample_dataset: 'synthetic',
      category: 'filter_sort',
      difficulty: 'medium',
      query_intent: 'Factual - Temporal',
    },
  },
  {
    input: {
      question:
        'What is the id of the project with highest daily average error count between Jun 2024 to Dec 2024',
    },
    output: {
      query: `FROM error_rate_daily
| WHERE date >= "2024-06-01" AND date <= "2024-12-31"
| STATS avg_daily_errors = AVG(error_count) BY project_id
| SORT avg_daily_errors DESC
| LIMIT 1
| KEEP project_id`,
    },
    metadata: {
      scenario_id: 'top_project_by_avg_errors_in_range',
      sample_dataset: 'synthetic',
      category: 'aggregation_time',
      difficulty: 'hard',
      query_intent: 'Factual - Temporal',
    },
  },
  {
    input: { question: 'How many user records are in the users index?' },
    output: {
      query: `FROM users
| STATS total_users = COUNT(*)`,
    },
    metadata: {
      scenario_id: 'count_all_users',
      sample_dataset: 'synthetic',
      category: 'aggregation',
      difficulty: 'easy',
      query_intent: 'Analytical - count',
    },
  },
  {
    input: { question: 'How many projects have not been deleted yet?' },
    output: {
      query: `FROM projects
| WHERE deleted_at IS NULL
| STATS active_projects = COUNT(*)`,
    },
    metadata: {
      scenario_id: 'count_non_deleted_projects',
      sample_dataset: 'synthetic',
      category: 'filter_aggregation',
      difficulty: 'easy',
      query_intent: 'Analytical - count with null',
    },
  },
  {
    input: {
      question:
        'List the five most recently deleted projects with their id and when they were deleted',
    },
    output: {
      query: `FROM projects
| WHERE deleted_at IS NOT NULL
| SORT deleted_at DESC
| LIMIT 5
| KEEP id, deleted_at`,
    },
    metadata: {
      scenario_id: 'top5_recent_deletions',
      sample_dataset: 'synthetic',
      category: 'filter_sort',
      difficulty: 'medium',
      query_intent: 'Analytical - ranking',
    },
  },
  {
    input: {
      question:
        'For each project_id, what is the total error_count summed across all rows in error_rate_daily, ordered from highest total to lowest?',
    },
    output: {
      query: `FROM error_rate_daily
| STATS total_errors = SUM(error_count) BY project_id
| SORT total_errors DESC`,
    },
    metadata: {
      scenario_id: 'sum_errors_by_project',
      sample_dataset: 'synthetic',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - group sum',
    },
  },
  {
    input: {
      question:
        'How many rows in error_rate_daily fall between January 1 2024 and December 31 2024 inclusive?',
    },
    output: {
      query: `FROM error_rate_daily
| WHERE date >= "2024-01-01" AND date <= "2024-12-31"
| STATS rows_2024 = COUNT(*)`,
    },
    metadata: {
      scenario_id: 'count_rows_in_year',
      sample_dataset: 'synthetic',
      category: 'filter_aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - time filter count',
    },
  },
  {
    input: {
      question:
        'What is the average error_count per document in error_rate_daily for the month of June 2024?',
    },
    output: {
      query: `FROM error_rate_daily
| WHERE date >= "2024-06-01" AND date < "2024-07-01"
| STATS avg_errors = AVG(error_count)`,
    },
    metadata: {
      scenario_id: 'avg_errors_single_month',
      sample_dataset: 'synthetic',
      category: 'aggregation_time',
      difficulty: 'medium',
      query_intent: 'Analytical - average in range',
    },
  },
  {
    input: { question: 'Show the ten most recently created users with their email and created_at' },
    output: {
      query: `FROM users
| SORT created_at DESC
| LIMIT 10
| KEEP email, created_at`,
    },
    metadata: {
      scenario_id: 'top10_newest_users',
      sample_dataset: 'synthetic',
      category: 'filter_sort',
      difficulty: 'easy',
      query_intent: 'Analytical - recent rows',
    },
  },
  {
    input: {
      question:
        'Which three project_ids have the largest total error_count when you add up every error_rate_daily row?',
    },
    output: {
      query: `FROM error_rate_daily
| STATS err = SUM(error_count) BY project_id
| SORT err DESC
| LIMIT 3`,
    },
    metadata: {
      scenario_id: 'top3_projects_by_total_errors',
      sample_dataset: 'synthetic',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - top n after sum',
    },
  },
  {
    input: {
      question:
        'What are the minimum and maximum date values stored in the error_rate_daily index?',
    },
    output: {
      query: `FROM error_rate_daily
| STATS min_date = MIN(date), max_date = MAX(date)`,
    },
    metadata: {
      scenario_id: 'min_max_error_rate_dates',
      sample_dataset: 'synthetic',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - bounds',
    },
  },
];

evaluate.describe('ES|QL tool evaluation', { tag: tags.serverless.search }, () => {
  evaluate('NL to ES|QL quality showcase (generate_esql tool)', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'esql: NL generation quality showcase (tool)',
        description:
          'Diverse natural-language questions over users / projects / error_rate_daily with gold ES|QL; ' +
          'predictions use the Agent Builder `generate_esql` tool. Judge: ES|QL functional equivalence. ' +
          'Use `scenario_id` / `category` in example metadata to slice demos.',
        examples: ESQL_TOOL_SHOWCASE_EXAMPLES,
      },
    });
  });
});
