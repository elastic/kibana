/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateGithubSearchIssuesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.github.search_issues'
description: 'Search for issues in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: query
    type: string
    required: false
steps:
  - name: search-issues
    type: github.searchIssues
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      query: "\${{inputs.query}}"
`;
}

export function generateGithubGetDocsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.github.get_docs'
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
name: 'sources.github.list_repos'
description: 'List repositories for a specific owner (user or organization)'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
steps:
  - name: list-repos
    type: github.listRepos
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
`;
}
