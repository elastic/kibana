/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * # Extraction Contract
 *
 * Any backend that provides content extraction — whether it's a workflow,
 * a stack connector, or a future integration — must conform to this contract.
 *
 * ## Input
 *
 * | Field      | Type   | Required | Description                                          |
 * |------------|--------|----------|------------------------------------------------------|
 * | `content`  | string | yes      | Base64-encoded file data                             |
 * | `filename` | string | yes      | Original filename with extension (e.g. "report.pdf") |
 * | `doc_id`   | string | no       | Optional document identifier for traceability        |
 *
 * ## Output
 *
 * | Field          | Type   | Required | Description                                      |
 * |----------------|--------|----------|--------------------------------------------------|
 * | `content`      | string | yes      | Extracted plain-text content                     |
 * | `content_type` | string | no       | Detected MIME type (e.g. "application/pdf")      |
 *
 * ---
 *
 * ## For workflows (`method: "workflow"`)
 *
 * The referenced workflow must declare matching `inputs` and its final step
 * must produce the output fields above. Example:
 *
 * ```yaml
 * version: '1'
 * name: my-custom-extraction
 * inputs:
 *   - name: content
 *     type: string
 *   - name: filename
 *     type: string
 *   - name: doc_id
 *     type: string
 *     required: false
 * steps:
 *   # ... your extraction logic ...
 *   - name: result
 *     type: data.set
 *     with:
 *       content: "${{steps.your_step.output.text}}"
 *       content_type: "application/pdf"
 * ```
 *
 * ## For connectors (`method: "connector"`)
 *
 * The connector must expose a sub-action named `extract` with the input/output
 * shapes above. The step calls:
 *
 * ```typescript
 * actionsClient.execute({
 *   actionId: connectorId,
 *   params: {
 *     subAction: 'extract',
 *     subActionParams: { content, filename, docId },
 *   },
 * })
 * ```
 *
 * and expects `result.data` to contain `{ content: string, contentType?: string }`.
 */

export interface ExtractionInput {
  content: string;
  filename: string;
  doc_id?: string;
}

export interface ExtractionOutput {
  content: string;
  content_type?: string;
}

/**
 * Sub-action name that extraction-capable connectors must expose.
 */
export const EXTRACTION_SUB_ACTION = 'extract';

/**
 * All supported extraction methods.
 *
 * - `tika` — Built-in Elasticsearch ingest attachment processor (Apache Tika).
 * - `inference` — Elasticsearch inference endpoint (completion task type).
 * - `workflow` — A user-defined workflow conforming to the extraction contract.
 * - `connector` — A stack connector exposing the `extract` sub-action.
 */
export const EXTRACTION_METHODS = ['tika', 'inference', 'workflow', 'connector'] as const;

export type ExtractionMethod = (typeof EXTRACTION_METHODS)[number];
