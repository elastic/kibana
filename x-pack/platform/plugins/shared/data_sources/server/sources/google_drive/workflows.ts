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
 * Generates a composite workflow that downloads files from Google Drive
 * and extracts their content using Jina Reader for LLM consumption.
 * Processes multiple files and returns an array of results.
 * Optionally reranks results by relevance to reduce context window usage.
 */
export function generateGoogleDriveDownloadFilesWithJinaWorkflow(
  googleDriveConnectorId: string,
  jinaConnectorId: string
): string {
  return `version: '1'
name: 'sources.google_drive.download'
description: Download files and extract their text content to readable markdown (best for PDFs, Word docs, etc.). You can optionally set rerank to true and specify topK to use semantic reranking - this is useful when downloading many documents and you want to avoid using too much of your context window by only keeping the top K most relevant documents based on the rerankQuery.
enabled: true
triggers:
  - type: manual
inputs:
  - name: fileIds
    type: array
    description: Array of file IDs from search or list results. Works with PDFs, Office docs, Google Docs, images with text, and more
  - name: rerank
    type: boolean
    required: false
    default: false
    description: Set to true to rerank results by relevance to rerankQuery. Useful when downloading many documents to reduce context window usage by keeping only the most relevant ones.
  - name: topK
    type: number
    required: false
    default: 5
    description: When rerank is true, return only the top K most relevant documents after reranking.
  - name: rerankQuery
    type: string
    required: false
    description: The query to rerank documents against. Required when rerank is true. Documents will be scored by relevance to this query.
steps:
  - name: init_results
    type: data.set
    with:
      results: []
  - name: process_files
    type: foreach
    foreach: "\${{inputs.fileIds}}"
    steps:
      - name: download_file
        type: google_drive.downloadFile
        connector-id: ${googleDriveConnectorId}
        with:
          fileId: "\${{foreach.item}}"
      - name: convert_to_markdown
        type: jina.fileToMarkdown
        connector-id: ${jinaConnectorId}
        with:
          file: "\${{steps.download_file.output.content}}"
          filename: "\${{steps.download_file.output.name}}"
      - name: normalize_result
        type: data.set
        with:
          normalized:
            fileId: "\${{foreach.item}}"
            filename: "\${{steps.download_file.output.name}}"
            content: "\${{steps.convert_to_markdown.output.content}}"
      - name: accumulate_result
        type: data.set
        with:
          results: '\${{variables.results | push: variables.normalized}}'
  - name: conditional_rerank
    type: if
    condition: "\${{inputs.rerank}}"
    steps:
      - name: do_rerank
        type: search.rerank
        with:
          rerank_text: "\${{inputs.rerankQuery}}"
          data: \${{variables.results}}
          fields:
            - ["content"]
          rank_window_size: \${{inputs.topK}}
      - name: store_reranked
        type: data.set
        with:
          final_results: "\${{steps.do_rerank.output}}"
    else:
      - name: store_all
        type: data.set
        with:
          final_results: "\${{variables.results}}"
  - name: output_results
    type: data.set
    with:
      results: "\${{variables.final_results}}"
`;
}

/**
 * Generates a composite workflow that downloads files from Google Drive
 * and extracts their content using Elasticsearch's attachment processor
 * via the ingest pipeline simulate API.
 *
 * This is the fallback when no Jina Reader connector is configured.
 * Uses Apache Tika under the hood for text extraction.
 * Processes multiple files and returns an array of results.
 * Optionally reranks results by relevance to reduce context window usage.
 */
export function generateGoogleDriveDownloadFilesWithIngestSimulateWorkflow(
  googleDriveConnectorId: string
): string {
  return `version: '1'
name: 'sources.google_drive.download'
description: Download files and extract their text content (best for PDFs, Word docs, etc.). You can optionally set rerank to true and specify topK to use semantic reranking - this is useful when downloading many documents and you want to avoid using too much of your context window by only keeping the top K most relevant documents based on the rerankQuery.
enabled: true
triggers:
  - type: manual
inputs:
  - name: fileIds
    type: array
    description: Array of file IDs from search or list results. Works with PDFs, Office docs, Google Docs, and other text-based formats
  - name: rerank
    type: boolean
    required: false
    default: false
    description: Set to true to rerank results by relevance to rerankQuery. Useful when downloading many documents to reduce context window usage by keeping only the most relevant ones.
  - name: topK
    type: number
    required: false
    default: 5
    description: When rerank is true, return only the top K most relevant documents after reranking.
  - name: rerankQuery
    type: string
    required: false
    description: The query to rerank documents against. Required when rerank is true. Documents will be scored by relevance to this query.
steps:
  - name: init_results
    type: data.set
    with:
      results: []
  - name: process_files
    type: foreach
    foreach: "\${{inputs.fileIds}}"
    steps:
      - name: download_file
        type: google_drive.downloadFile
        connector-id: ${googleDriveConnectorId}
        with:
          fileId: "\${{foreach.item}}"
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
              - _id: "\${{foreach.item}}"
                _source:
                  filename: "\${{steps.download_file.output.name}}"
                  data: "\${{steps.download_file.output.content}}"
      - name: normalize_result
        type: data.set
        with:
          normalized:
            fileId: "\${{foreach.item}}"
            filename: "\${{steps.download_file.output.name}}"
            content: "\${{steps.extract_content.output.docs[0].doc._source.attachment.content}}"
            content_type: "\${{steps.extract_content.output.docs[0].doc._source.attachment.content_type}}"
      - name: accumulate_result
        type: data.set
        with:
          results: '\${{variables.results | push: variables.normalized}}'
  - name: conditional_rerank
    type: if
    condition: "\${{inputs.rerank}}"
    steps:
      - name: do_rerank
        type: search.rerank
        with:
          rerank_text: "\${{inputs.rerankQuery}}"
          data: \${{variables.results}}
          fields:
            - ["content"]
          rank_window_size: \${{inputs.topK}}
      - name: store_reranked
        type: data.set
        with:
          final_results: "\${{steps.do_rerank.output}}"
    else:
      - name: store_all
        type: data.set
        with:
          final_results: "\${{variables.results}}"
  - name: output_results
    type: data.set
    with:
      results: "\${{variables.final_results}}"
`;
}
