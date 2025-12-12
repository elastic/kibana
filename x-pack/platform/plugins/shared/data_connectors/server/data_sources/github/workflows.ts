/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateGithubSearchIssuesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'github.search_issues'
description: 'Search for issues in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: state
    type: choice
    options:
      - "open"
      - "closed"
      - "all"
    default: "open"
  - name: query
    type: string
steps:
  - name: search-issues
    type: github.searchIssues
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      state: "\${{inputs.state}}"
      query: "\${{inputs.query}}"
`;
}

export function generateGithubGetDocsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'github.get_docs'
description: 'Get all markdown files from a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: ref
    type: string
    default: "main"
steps:
  - name: get-docs
    type: github.getDocs
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      ref: "\${{inputs.ref}}"
`;
}

export function generateGithubListRepositoriesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'github.list_repositories'
description: 'List repositories for a specific owner (user or organization)'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: type
    type: choice
    options:
      - "all"
      - "owner"
      - "member"
    default: "all"
  - name: sort
    type: choice
    options:
      - "created"
      - "updated"
      - "pushed"
      - "full_name"
    default: "full_name"
  - name: direction
    type: choice
    options:
      - "asc"
      - "desc"
    default: "asc"
  - name: perPage
    type: number
    default: 30
  - name: page
    type: number
    default: 1
steps:
  - name: list-repositories
    type: github.listRepositories
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      type: "\${{inputs.type}}"
      sort: "\${{inputs.sort}}"
      direction: "\${{inputs.direction}}"
      perPage: "\${{inputs.perPage}}"
      page: "\${{inputs.page}}"
`;
}
