/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function generateSearchWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'Notion search'
description: 'Search for pages or data sources that contain a given string in the title'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query_string
    type: string
  - name: query_object
    type: choice
    options:
      - "page"
      - "data_source"
steps:
  - name: search-page-by-title
    type: notion.searchPageByTitle
    connector-id: ${stackConnectorId}
    with:
      query: "\${{inputs.query_string}}"
      queryObjectType: "\${{inputs.query_object}}"

`;
}

function generateQueryWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'Notion query data source'
description: 'Given the ID of a data source, query information about its rows. By default it will fetch 10 items, unless you specify page_size or cursor. You can filter the results by specifying the \`filter\`, which is a string representation of the JSON that would be passed, as per documentation in https://developers.notion.com/reference/filter-data-source-entries'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: data_source_id
    type: string
  - name: filter_by
    type: string
    required: false
  - name: page_size
    type: number
    required: false
    default: 10
  - name: start_cursor
    type: string
    required: false
steps:
  - name: query-data-source
    type: notion.queryDataSource
    connector-id: ${stackConnectorId}
    with:
      dataSourceId: "\${{inputs.data_source_id}}"
      pageSize: \${{inputs.page_size}}
      startCursor: "\${{inputs.start_cursor}}"
      filter: "\${{inputs.filter_by}}"

`;
}

function generateGetPageWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'Notion get page'
description: 'Given the ID of a Notion page, get metadata related to it'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: page_id
    type: string
steps:
  - name: get-page
    type: notion.getPage
    connector-id: ${stackConnectorId}
    with:
      pageId: "\${{inputs.page_id}}"

`;
}

function generateGetDataSourceWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'Notion get data source'
description: 'Given the ID of a data source, get information about its columns'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: data_source_id
    type: string
steps:
  - name: get-data-source
    type: notion.getDataSource
    connector-id: ${stackConnectorId}
    with:
      dataSourceId: "\${{inputs.data_source_id}}"

`;
}

/**
 * Creates a workflow template for Notion
 * @param stackConnectorId - The ID of the stack connector connected via OAuth
 * @returns Workflow YAML template with secret reference
 */
export function createNotionSearchWorkflowTemplates(stackConnectorId: string): string[] {
  return [
    generateSearchWorkflow(stackConnectorId),
    generateQueryWorkflow(stackConnectorId),
    generateGetPageWorkflow(stackConnectorId),
    generateGetDataSourceWorkflow(stackConnectorId),
  ];
}
