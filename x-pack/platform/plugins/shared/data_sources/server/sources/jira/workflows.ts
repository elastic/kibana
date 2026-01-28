/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateSearchIssuesWithJqlWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.jira.search_issues_with_jql'
description: 'Search Jira issues using a JQL (Jira Query Language) query'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: jql
    type: string
steps:
  - name: search-issues-with-jql
    type: jira.searchIssuesWithJql
    connector-id: ${stackConnectorId}
    with:
      jql: "\${{inputs.jql}}"

`;
}
