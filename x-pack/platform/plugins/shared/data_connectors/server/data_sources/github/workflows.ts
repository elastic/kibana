/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateGithubSearchIssuesWorkflow(stackConnectorId: string, name: string): string {
  return `version: '1'
name: '${name}.sources.github.search_issues'
description: 'Search for issues in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: order
    type: string
    default: "desc"
  - name: owner
    type: string
  - name: repo
    type: string
  - name: query
    type: string
    required: false
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
steps:
  - name: search-issues
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_issues"
      arguments:
        order: "\${{inputs.order}}"
        owner: "\${{inputs.owner}}"
        repo: "\${{inputs.repo}}"
        query: "\${{inputs.query}}"
        page: "\${{inputs.page}}"
        per_page: "\${{inputs.per_page}}"
`;
}

export function generateGithubSearchCodeWorkflow(stackConnectorId: string, name: string): string {
  return `version: '1'
name: '${name}.sources.github.search_code'
description: 'Search for code in GitHub repositories'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: order
    type: string
    default: "desc"
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
  - name: query
    type: string
    required: false
  - name: sort
    type: string
    default: "best_match"
steps:
  - name: search-code
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_code"
      arguments:
        order: "\${{inputs.order}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        query: "\${{inputs.query}}"
        sort: "\${{inputs.sort}}"
`;
}

export function generateGithubSearchPullRequestsWorkflow(
  stackConnectorId: string,
  name: string
): string {
  return `version: '1'
name: '${name}.sources.github.search_pull_requests'
description: 'Search for pull requests in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: order
    type: string
    default: "desc"
  - name: owner
    type: string
  - name: repo
    type: string
  - name: query
    type: string
    required: false
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
  - name: sort
    type: string
    default: "best_match"
steps:
  - name: search-pull-requests
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_pull_requests"
      arguments:
        order: "\${{inputs.order}}"
        owner: "\${{inputs.owner}}"
        repo: "\${{inputs.repo}}"
        query: "\${{inputs.query}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        sort: "\${{inputs.sort}}"
`;
}

export function generateGithubSearchRepositoriesWorkflow(
  stackConnectorId: string,
  name: string
): string {
  return `version: '1'
name: '${name}.sources.github.search_repositories'
description: 'Search for GitHub repositories'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: minimal_output
    type: boolean
    default: false
  - name: order
    type: string
    default: "desc"
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
  - name: query
    type: string
    required: false
  - name: sort
    type: string
    default: "best_match"
steps:
  - name: search-repositories
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_repositories"
      arguments:
        minimalOutput: "\${{inputs.minimal_output}}"
        order: "\${{inputs.order}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        query: "\${{inputs.query}}"
        sort: "\${{inputs.sort}}"
`;
}

export function generateGithubSearchUsersWorkflow(stackConnectorId: string, name: string): string {
  return `version: '1'
name: '${name}.sources.github.search_users'
description: 'Search for GitHub users'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: order
    type: string
    default: "desc"
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
  - name: query
    type: string
    required: false
  - name: sort
    type: string
    default: "best_match"
steps:
  - name: search-users
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_users"
      arguments:
        order: "\${{inputs.order}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        query: "\${{inputs.query}}"
        sort: "\${{inputs.sort}}"
`;
}
