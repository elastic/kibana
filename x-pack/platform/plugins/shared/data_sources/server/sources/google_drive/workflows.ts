/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function generateGoogleDriveSearchFilesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.google_drive.search'
description: Search for files in Google Drive using Google's query syntax
enabled: true
triggers:
  - type: manual
inputs:
  - name: query
    type: string
    description: "Google Drive query. Use fullText contains 'term' for content search, name contains 'term' for filename, mimeType='application/pdf' for type filtering, modifiedTime > '2024-01-01' for date filtering. Combine with 'and'/'or'."
  - name: pageSize
    type: number
    required: false
    description: Number of results to return (default 250, max 1000)
  - name: pageToken
    type: string
    required: false
    description: "Pagination token. Pass the 'nextPageToken' value from a previous response to get the next page. When nextPageToken is absent in the response, there are no more results."
steps:
  - name: search_files
    type: google_drive.searchFiles
    connector-id: ${stackConnectorId}
    with:
      query: "\${{inputs.query}}"
      pageSize: \${{inputs.pageSize}}
      pageToken: "\${{inputs.pageToken}}"
`;
}

export function generateGoogleDriveListFilesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.google_drive.list'
description: List files and subfolders in a Google Drive folder
enabled: true
triggers:
  - type: manual
inputs:
  - name: folderId
    type: string
    default: root
    description: "Folder ID to list contents of. Use 'root' for the root folder, or a folder ID from search/list results"
  - name: pageSize
    type: number
    required: false
    description: Number of results to return (default 250, max 1000)
  - name: pageToken
    type: string
    required: false
    description: "Pagination token. Pass the 'nextPageToken' value from a previous response to get the next page. When nextPageToken is absent in the response, there are no more results."
  - name: orderBy
    type: string
    required: false
    description: "Sort order: 'name', 'modifiedTime', or 'createdTime'"
steps:
  - name: list_files
    type: google_drive.listFiles
    connector-id: ${stackConnectorId}
    with:
      folderId: "\${{inputs.folderId}}"
      pageSize: \${{inputs.pageSize}}
      pageToken: "\${{inputs.pageToken}}"
      orderBy: "\${{inputs.orderBy}}"
`;
}

/**
 * Generates a composite workflow that downloads a file from Google Drive
 * and extracts its content using Jina Reader for LLM consumption.
 */
export function generateGoogleDriveDownloadFilesWithJinaWorkflow(
  googleDriveConnectorId: string,
  jinaConnectorId: string
): string {
  return `version: '1'
name: 'sources.google_drive.download'
description: Download a file and extract its text content to readable markdown (best for PDFs, Word docs, etc.)
enabled: true
triggers:
  - type: manual
inputs:
  - name: fileId
    type: string
    description: File ID from search or list results. Works with PDFs, Office docs, Google Docs, images with text, and more
steps:
  - name: download_file
    type: google_drive.downloadFile
    connector-id: ${googleDriveConnectorId}
    with:
      fileId: "\${{inputs.fileId}}"
  - name: convert_to_markdown
    type: jina.fileToMarkdown
    connector-id: ${jinaConnectorId}
    with:
      file: "\${{steps.download_file.output.content}}"
      filename: "\${{steps.download_file.output.name}}"
`;
}

/**
 * Generates a composite workflow that downloads a file from Google Drive
 * and extracts its content using Elasticsearch's attachment processor
 * via the ingest pipeline simulate API.
 *
 * This is the fallback when no Jina Reader connector is configured.
 * Uses Apache Tika under the hood for text extraction.
 */
export function generateGoogleDriveDownloadFilesWithIngestSimulateWorkflow(
  googleDriveConnectorId: string
): string {
  return `version: '1'
name: 'sources.google_drive.download'
description: Download a file and extract its text content (best for PDFs, Word docs, etc.)
enabled: true
triggers:
  - type: manual
inputs:
  - name: fileId
    type: string
    description: File ID from search or list results. Works with PDFs, Office docs, Google Docs, and other text-based formats
steps:
  - name: download_file
    type: google_drive.downloadFile
    connector-id: ${googleDriveConnectorId}
    with:
      fileId: "\${{inputs.fileId}}"
  - name: extract_content
    type: elasticsearch.request
    with:
      method: POST
      path: /_ingest/pipeline/_simulate
      body:
        pipeline:
          processors:
            - attachment:
                field: data
                indexed_chars: -1
                remove_binary: true
        docs:
          - _id: "\${{inputs.fileId}}"
            _source:
              filename: "\${{steps.download_file.output.name}}"
              data: "\${{steps.download_file.output.content}}"
`;
}
