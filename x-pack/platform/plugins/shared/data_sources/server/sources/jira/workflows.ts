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
  - name: maxResults
    type: number
    required: false
  - name: nextPageToken
    type: string
    required: false
steps:
  - name: search-issues-with-jql
    type: jira.searchIssuesWithJql
    connector-id: ${stackConnectorId}
    with:
      jql: "\${{inputs.jql}}"
      maxResults: \${{inputs.maxResults}}
      nextPageToken: "\${{inputs.nextPageToken}}"

`;
}

export function generateGetIssueWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.jira.get_issue'
description: 'Get a Jira issue by its ID or key'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: issueId
    type: string
steps:
  - name: get-issue
    type: jira.getIssue
    connector-id: ${stackConnectorId}
    with:
      issueId: "\${{inputs.issueId}}"

`;
}

export function generateGetProjectsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.jira.get_projects'
description: 'Search for Jira projects'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: maxResults
    type: number
    required: false
  - name: startAt
    type: number
    required: false
  - name: query
    type: string
    required: false
steps:
  - name: get-projects
    type: jira.getProjects
    connector-id: ${stackConnectorId}
    with:
      maxResults: \${{inputs.maxResults}}
      startAt: \${{inputs.startAt}}
      query: "\${{inputs.query}}"

`;
}

export function generateGetProjectWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.jira.get_project'
description: 'Get a Jira project by its ID or key'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: projectId
    type: string
steps:
  - name: get-project
    type: jira.getProject
    connector-id: ${stackConnectorId}
    with:
      projectId: "\${{inputs.projectId}}"

`;
}
