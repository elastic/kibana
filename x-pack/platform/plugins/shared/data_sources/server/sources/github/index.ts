/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { githubDataSource } from './data_type';
export {
  createIssueAggregator,
  type IssueAggregator,
  type IssueAggregatorConfig,
  type GitHubIssue,
  type AggregatedIssue,
  type IssueSource,
  type IssueAggregationResult,
} from './issue_aggregator';
