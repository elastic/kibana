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

export function generateGithubSearchPullRequestsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.github.search_pull_requests'
description: 'Search for pull requests in a GitHub repository'
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
  - name: search-pull-requests
    type: github.searchPullRequests
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      query: "\${{inputs.query}}"
`;
}

export function generateGithubGetIssueWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.github.get_issue'
description: 'Get a specific issue from a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: issueNumber
    type: number
steps:
  - name: get-issue
    type: github.getIssue
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      issueNumber: "\${{inputs.issueNumber}}"
`;
}

export function generateGithubGetPullRequestWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.github.get_pull_request'
description: 'Get a specific pull request from a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: pullNumber
    type: number
steps:
  - name: get-pull-request
    type: github.getPullRequest
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      pullNumber: "\${{inputs.pullNumber}}"
`;
}

export function generateGithubGetFileContentsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.github.get_file_contents'
description: 'Get contents of a file or directory from a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: path
    type: string
  - name: ref
    type: string
    default: "main"
    required: false
steps:
  - name: get-file-contents
    type: github.getFileContents
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      path: "\${{inputs.path}}"
      ref: "\${{inputs.ref}}"
`;
}

export function generateGithubListBranchesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.github.list_branches'
description: 'List branches in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: page
    type: number
    required: false
  - name: perPage
    type: number
    required: false
steps:
  - name: list-branches
    type: github.listBranches
    connector-id: ${stackConnectorId}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      page: "\${{inputs.page}}"
      perPage: "\${{inputs.perPage}}"
`;
}
