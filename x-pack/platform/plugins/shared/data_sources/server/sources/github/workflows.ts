/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateGithubSearchWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'search'
description: 'Search through Github. Use the Github search query syntax.'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: tool_name
    type: string
    required: true
    description: "Name of the tool to use. Valid values: search_issues, search_pull_requests, search_repositories, search_users, search_code"
  - name: query
    type: string
    required: true
    description: "Query to search for issues. e.g. 'repo:elastic/kibana is:open is:issue'"
  - name: order
    type: string
    default: "desc"
    description: "Sort order. Valid values: asc, desc"
  - name: owner
    type: string
    required: false
    description: "Owner of the repository."
  - name: repo
    type: string
    required: false
    description: "Repository name."
  - name: page
    type: number
    default: 1
    required: false
    description: "Page number to return. Valid values: 1-100"
  - name: per_page
    type: number
    default: 10
    required: false
    description: "Number of issues to return per page. Valid values: 1-100"
  - name: sort
    type: string
    default: "created"
    required: false
    description: "Sort field. Valid values: comments, reactions, reactions-+1, reactions--1, reactions-smile, reactions-thinking_face, reactions-heart, reactions-tada, interactions, created, updated"
  - name: minimal_output
    type: boolean
    default: false
    required: false
    description: "Searching repositories only. If true, only the issue number and title will be returned."
steps:
  - name: search-github
    type: mcp.callTool
    connector-id: ${stackConnectorId}
    with:
      name: "\${{inputs.tool_name}}"
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
