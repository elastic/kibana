/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';

export const ExtractStepTypeId = 'extraction.extract';

const ExtractInputSchema = z.object({
  content: z.string().describe('Base64-encoded file content to extract text from'),
  filename: z.string().describe('Filename with extension, used for content type detection'),
  doc_id: z
    .string()
    .optional()
    .describe('Optional document identifier, passed as _id in the simulated doc'),
});

const ExtractConfigSchema = z.object({
  method: z
    .enum(['tika', 'inference', 'workflow', 'connector'])
    .optional()
    .describe(
      'Extraction method. "tika" uses the built-in ingest attachment processor. ' +
        '"inference" uses an ES inference endpoint. "workflow" delegates to a user-defined ' +
        'workflow that conforms to the extraction contract. "connector" uses a stack connector ' +
        'exposing an "extract" sub-action. Defaults to the global setting, or "tika" if unset.'
    ),
  inference_id: z
    .string()
    .optional()
    .describe(
      'Inference endpoint ID. Only used when method is "inference". ' +
        'If omitted, automatically selects an available extraction endpoint.'
    ),
  workflow_id: z
    .string()
    .optional()
    .describe(
      'Workflow ID to delegate extraction to. Only used when method is "workflow". ' +
        'The workflow must accept inputs: content (string), filename (string), doc_id (string, optional) ' +
        'and output: content (string), content_type (string, optional).'
    ),
  connector_id: z
    .string()
    .optional()
    .describe(
      'Stack connector ID. Only used when method is "connector". ' +
        'The connector must expose an "extract" sub-action accepting { content, filename, docId } ' +
        'and returning { content, contentType }.'
    ),
});

const ExtractOutputSchema = z.object({
  content: z.string().describe('Extracted text content'),
  content_type: z
    .string()
    .optional()
    .describe('Detected MIME content type of the document (e.g. application/pdf)'),
});

export type ExtractInput = z.infer<typeof ExtractInputSchema>;
export type ExtractConfig = z.infer<typeof ExtractConfigSchema>;
export type ExtractOutput = z.infer<typeof ExtractOutputSchema>;

export const extractStepCommonDefinition: CommonStepDefinition<
  typeof ExtractInputSchema,
  typeof ExtractOutputSchema,
  typeof ExtractConfigSchema
> = {
  id: ExtractStepTypeId,
  category: StepCategory.Elasticsearch,
  label: i18n.translate('xpack.dataSources.extractStep.label', {
    defaultMessage: 'Extract Content',
  }),
  description: i18n.translate('xpack.dataSources.extractStep.description', {
    defaultMessage:
      'Extract text content from base64-encoded files using Tika, an inference endpoint, a custom workflow, or a connector',
  }),
  documentation: {
    details: i18n.translate('xpack.dataSources.extractStep.documentation.details', {
      defaultMessage: `The extraction step converts base64-encoded file data into plain text.

**Methods:**
• **tika** (default) — Built-in Elasticsearch ingest attachment processor (Apache Tika). Supports PDFs, Word, Excel, PowerPoint, HTML, RTF, plain text, and more. Runs within your cluster.
• **inference** — Sends the document to an Elasticsearch inference endpoint (e.g. a vision-capable LLM). Useful for scanned PDFs, images, or documents needing OCR.
• **workflow** — Delegates to a user-defined workflow. The workflow must conform to the extraction contract (see below).
• **connector** — Calls a stack connector that exposes an "extract" sub-action (see below).

**Extraction contract (inputs):**
• content (string, required) — Base64-encoded file data
• filename (string, required) — Original filename with extension
• doc_id (string, optional) — Document identifier for traceability

**Extraction contract (outputs):**
• content (string, required) — Extracted plain text
• content_type (string, optional) — Detected MIME type (e.g. application/pdf)

**Workflow method:** The referenced workflow must declare inputs named content, filename, and optionally doc_id. Its final output must include content (string) and optionally content_type (string).

**Connector method:** The connector must expose a sub-action named "extract" that accepts {content, filename, docId} and returns {content, contentType}.

**Configuration:**
• method — Override the global default extraction method
• inference_id — Inference endpoint ID (when method is "inference")
• workflow_id — Workflow ID (when method is "workflow")
• connector_id — Stack connector ID (when method is "connector")`,
    }),
    examples: [
      `## Basic Tika extraction (default)
\`\`\`yaml
- name: extract
  type: ${ExtractStepTypeId}
  with:
    content: "\${{steps.download.output.base64}}"
    filename: "\${{steps.download.output.name}}"
\`\`\``,
      `## Extraction with inference endpoint
\`\`\`yaml
- name: extract
  type: ${ExtractStepTypeId}
  config:
    method: inference
    inference_id: my-document-extraction-model
  with:
    content: "\${{steps.download.output.base64}}"
    filename: "\${{steps.download.output.name}}"
\`\`\``,
      `## Extraction with a custom workflow
\`\`\`yaml
- name: extract
  type: ${ExtractStepTypeId}
  config:
    method: workflow
    workflow_id: "workflow-abc123"
  with:
    content: "\${{steps.download.output.base64}}"
    filename: "\${{steps.download.output.name}}"
\`\`\``,
      `## Extraction with a stack connector
\`\`\`yaml
- name: extract
  type: ${ExtractStepTypeId}
  config:
    method: connector
    connector_id: "my-unstructured-connector"
  with:
    content: "\${{steps.download.output.base64}}"
    filename: "\${{steps.download.output.name}}"
\`\`\``,
    ],
  },
  inputSchema: ExtractInputSchema,
  configSchema: ExtractConfigSchema,
  outputSchema: ExtractOutputSchema,
};
