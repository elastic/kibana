/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateGithubSearchIssuesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'search_issues'
description: 'Search for issues in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
  - name: order
    type: string
    default: "desc"
    description: "Sort order. Valid values: asc, desc"
  - name: owner
    type: string
    required: false
  - name: repo
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
    default: "created"
    description: "Sort field. Valid values: comments, reactions, reactions-+1, reactions--1, reactions-smile, reactions-thinking_face, reactions-heart, reactions-tada, interactions, created, updated"
steps:
  - name: search-issues
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_issues"
      arguments:
        query: "\${{inputs.query}}"
        order: "\${{inputs.order}}"
        owner: "\${{inputs.owner}}"
        repo: "\${{inputs.repo}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        sort: "\${{inputs.sort}}"
        type: "issue"
`;
}
export function generateGithubSearchCodeWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'search_code'
description: 'Search for code in GitHub repositories'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
  - name: order
    type: string
    default: "desc"
    description: "Sort order. Valid values: asc, desc"
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
steps:
  - name: search-code
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_code"
      arguments:
        query: "\${{inputs.query}}"
        order: "\${{inputs.order}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        sort: 'indexed'
`;
}

export function generateGithubSearchPullRequestsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'search_pull_requests'
description: 'Search for pull requests in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
  - name: order
    type: string
    default: "desc"
    description: "Sort order. Valid values: asc, desc"
  - name: owner
    type: string
    required: false
  - name: repo
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
    default: "created"
    description: "Sort field. Valid values: comments, reactions, reactions-+1, reactions--1, reactions-smile, reactions-thinking_face, reactions-heart, reactions-tada, interactions, created, updated"
steps:
  - name: search-pull-requests
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_pull_requests"
      arguments:
        query: "\${{inputs.query}}"
        order: "\${{inputs.order}}"
        owner: "\${{inputs.owner}}"
        repo: "\${{inputs.repo}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        sort: "\${{inputs.sort}}"
`;
}

export function generateGithubSearchRepositoriesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'search_repositories'
description: 'Search for GitHub repositories'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
  - name: minimal_output
    type: boolean
    default: true
  - name: order
    type: string
    default: "desc"
    description: "Sort order. Valid values: asc, desc"
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
  - name: sort
    type: string
    default: "stars"
    description: "Sort field. Valid values: stars, forks, help-wanted-issues, updated"
steps:
  - name: search-repositories
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_repositories"
      arguments:
        query: "\${{inputs.query}}"
        minimalOutput: "\${{inputs.minimal_output}}"
        order: "\${{inputs.order}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        sort: "\${{inputs.sort}}"
`;
}

export function generateGithubSearchUsersWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'search_users'
description: 'Search for GitHub users'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
  - name: order
    type: string
    default: "desc"
    description: "Sort order. Valid values: asc, desc"
  - name: page
    type: number
    default: 1
  - name: per_page
    type: number
    default: 10
  - name: sort
    type: string
    default: "followers"
    description: "Sort field. Valid values: followers, repositories, joined"
steps:
  - name: search-users
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "search_users"
      arguments:
        query: "\${{inputs.query}}"
        order: "\${{inputs.order}}"
        page: "\${{inputs.page}}"
        perPage: "\${{inputs.per_page}}"
        sort: "\${{inputs.sort}}"
`;
}
