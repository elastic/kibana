/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaApiOperationConfig } from '@kbn/agent-builder-common/tools';
import type { KibanaOpenApiIndexedOperation } from './openapi_kibana_catalog';

function deref(root: Record<string, unknown>, node: unknown): unknown {
  if (!node || typeof node !== 'object') {
    return node;
  }
  if ('$ref' in node && typeof (node as { $ref: string }).$ref === 'string') {
    const ref = (node as { $ref: string }).$ref;
    if (!ref.startsWith('#/')) {
      return { type: 'object', additionalProperties: true };
    }
    const segs = ref.slice(2).split('/');
    let cur: unknown = root;
    for (const s of segs) {
      if (cur && typeof cur === 'object' && s in (cur as object)) {
        cur = (cur as Record<string, unknown>)[s];
      } else {
        return { type: 'object', additionalProperties: true };
      }
    }
    return deref(root, cur);
  }
  return node;
}

const METHODS_THAT_MAY_SEND_JSON_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const MAX_OPENAPI_BODY_SCHEMA_CHARS = 12_000;
const MAX_OPENAPI_EXAMPLES_CHARS = 8_000;

function jsonSchemaLooksInformative(schema: unknown): boolean {
  if (schema === undefined || schema === null) {
    return false;
  }
  if (typeof schema !== 'object') {
    return true;
  }
  if (Array.isArray(schema)) {
    return schema.length > 0;
  }
  const keys = Object.keys(schema as object);
  if (keys.length === 0) {
    return false;
  }
  const o = schema as Record<string, unknown>;
  if (keys.length === 1 && o.type === 'object' && !('properties' in o)) {
    return false;
  }
  return true;
}

function stableStringifySnippet(value: unknown, maxChars: number): string {
  try {
    let s = JSON.stringify(value, null, 2);
    if (s.length > maxChars) {
      s = `${s.slice(0, maxChars)}…`;
    }
    return s;
  } catch {
    const s = String(value);
    return s.length > maxChars ? `${s.slice(0, maxChars)}…` : s;
  }
}

function formatJsonContentExamples(
  root: Record<string, unknown>,
  jsonBody: Record<string, unknown>
): string | undefined {
  const chunks: string[] = [];
  if ('example' in jsonBody && jsonBody.example !== undefined) {
    chunks.push(
      `OpenAPI \`example\`:\n${stableStringifySnippet(
        jsonBody.example,
        MAX_OPENAPI_EXAMPLES_CHARS
      )}`
    );
  }
  const examples = jsonBody.examples;
  if (examples && typeof examples === 'object' && !Array.isArray(examples)) {
    for (const [name, ex] of Object.entries(examples as Record<string, unknown>)) {
      const exRes = deref(root, ex) as Record<string, unknown>;
      const summary = typeof exRes.summary === 'string' ? exRes.summary.trim() : '';
      const desc = typeof exRes.description === 'string' ? exRes.description.trim() : '';
      const value = exRes.value;
      const header = [name, summary, desc].filter(Boolean).join(' — ');
      chunks.push(
        `${header ? `**${header}**\n` : ''}${stableStringifySnippet(
          value,
          MAX_OPENAPI_EXAMPLES_CHARS
        )}`
      );
    }
  }
  if (chunks.length === 0) {
    return undefined;
  }
  let out = chunks.join('\n\n');
  if (out.length > MAX_OPENAPI_EXAMPLES_CHARS) {
    out = `${out.slice(0, MAX_OPENAPI_EXAMPLES_CHARS)}…`;
  }
  return out;
}

function getApplicationJsonRequestBodyParts(
  root: Record<string, unknown>,
  op: Record<string, unknown>,
  methodUpper: string
): {
  jsonBody: Record<string, unknown> | undefined;
  bodyRequired: boolean;
  hasDeclaredRequestBody: boolean;
  needsBodyDocumentation: boolean;
} {
  const requestBody = deref(root, op.requestBody) as Record<string, unknown> | undefined;
  const hasDeclaredRequestBody = Boolean(requestBody && typeof requestBody === 'object');
  const content =
    requestBody && typeof requestBody === 'object'
      ? (requestBody.content as Record<string, Record<string, unknown>> | undefined)
      : undefined;
  const jsonBody = content?.['application/json'];
  const bodyRequired = Boolean(requestBody && (requestBody as { required?: boolean }).required);
  const hasJsonSchemaBody = Boolean(jsonBody && typeof jsonBody === 'object' && jsonBody.schema);
  const mayHaveBody = METHODS_THAT_MAY_SEND_JSON_BODY.has(methodUpper);
  const needsBodyDocumentation =
    mayHaveBody &&
    (hasJsonSchemaBody ||
      (hasDeclaredRequestBody && Boolean(jsonBody) && typeof jsonBody === 'object'));
  return {
    jsonBody: jsonBody && typeof jsonBody === 'object' ? jsonBody : undefined,
    bodyRequired,
    hasDeclaredRequestBody,
    needsBodyDocumentation,
  };
}

/**
 * Human-readable reference for the `application/json` request body of one OpenAPI operation.
 * Embeds the JSON Schema when informative; otherwise falls back to OpenAPI `example` / `examples`.
 */
export function formatOpenApiApplicationJsonBodyHelp(
  root: Record<string, unknown>,
  indexed: KibanaOpenApiIndexedOperation
): string | null {
  const op = indexed.operation;
  const pathTemplate = indexed.path_template;
  const methodUpper = indexed.method.toUpperCase();
  const { jsonBody, bodyRequired, needsBodyDocumentation } = getApplicationJsonRequestBodyParts(
    root,
    op,
    methodUpper
  );
  if (!needsBodyDocumentation) {
    return null;
  }

  const base = `Raw JSON object for the HTTP request body of ${methodUpper} \`${pathTemplate}\`. Every key you include is forwarded unchanged to Kibana (no field is dropped by the tool).`;
  const schemaNode = jsonBody?.schema;
  const hasInformativeSchema = jsonSchemaLooksInformative(schemaNode);
  const examplesBlock =
    jsonBody && typeof jsonBody === 'object'
      ? formatJsonContentExamples(root, jsonBody as Record<string, unknown>)
      : undefined;

  const parts: string[] = [base];

  if (hasInformativeSchema && schemaNode !== undefined) {
    let excerpt: string;
    try {
      excerpt = JSON.stringify(schemaNode, null, 2);
    } catch {
      excerpt = String(schemaNode);
    }
    if (excerpt.length > MAX_OPENAPI_BODY_SCHEMA_CHARS) {
      excerpt = `${excerpt.slice(0, MAX_OPENAPI_BODY_SCHEMA_CHARS)}…`;
    }
    parts.push(
      `OpenAPI \`application/json\` schema (reference — include required fields when the API expects them):\n${excerpt}`
    );
  } else if (examplesBlock) {
    parts.push(
      `No informative JSON Schema on this operation; use these OpenAPI examples instead:\n${examplesBlock}`
    );
  }

  parts.push(`(${bodyRequired ? 'required' : 'optional'}).`);
  return parts.join('\n\n');
}

/**
 * Markdown-style block documenting JSON request bodies for all configured operations.
 * Used in the tool parameter schema root description and in `getLlmDescription`.
 */
export function buildOpenApiBodyDocumentationForKibanaApiOperations(
  root: Record<string, unknown>,
  entries: KibanaApiIndexedOperationEntry[]
): string {
  const sections: string[] = [];
  for (const { operation, indexed } of entries) {
    const help = formatOpenApiApplicationJsonBodyHelp(root, indexed);
    if (!help) {
      continue;
    }
    const methodUpper = indexed.method.toUpperCase();
    sections.push(
      [
        `#### \`${operation.operation_id}\` — ${methodUpper} \`${indexed.path_template}\``,
        help,
      ].join('\n\n')
    );
  }
  if (sections.length === 0) {
    return '';
  }
  return ['**Request body (`application/json`) per operation**', '', ...sections].join('\n');
}

export interface KibanaApiIndexedOperationEntry {
  operation: KibanaApiOperationConfig;
  indexed: KibanaOpenApiIndexedOperation;
}

/**
 * Bedrock-safe tool input: root `{ type: "object" }` with **operation_id** plus optional
 * **path** / **query** / **body** (same shape for one or many operations). Per-operation OpenAPI
 * JSON body schema (and examples when the schema is empty) is appended to the root schema
 * `description` via {@link buildOpenApiBodyDocumentationForKibanaApiOperations}.
 */
export function buildKibanaApiMultiOperationToolParamsSchema(
  root: Record<string, unknown>,
  entries: KibanaApiIndexedOperationEntry[]
): z.ZodType {
  if (entries.length === 0) {
    return z.object({}).describe('No Kibana API operations are configured for this tool.');
  }

  const idList = entries.map((e) => e.operation.operation_id);
  const [head, ...tail] = idList;
  if (head === undefined) {
    return z.object({}).describe('No Kibana API operations are configured for this tool.');
  }

  const operationSummaries = entries.map((e) => {
    const { indexed } = e;
    const op = indexed.operation;
    const apiSummary =
      typeof op.summary === 'string'
        ? op.summary.trim()
        : typeof op.description === 'string'
        ? op.description.trim().slice(0, 200)
        : '';
    return `- \`${e.operation.operation_id}\`: \`${indexed.method} ${indexed.path_template}\`${
      apiSummary ? ` — ${apiSummary}` : ''
    }`;
  });

  const bodyDoc = buildOpenApiBodyDocumentationForKibanaApiOperations(root, entries);

  const topDescribeParts = [
    `This tool exposes **${entries.length}** Kibana REST operation(s) from the OpenAPI catalog.`,
    'Set **operation_id** to the exact id of the operation to run, then include only the **path**, **query**, and/or **body** fields that operation expects.',
    '',
    '**Configured operations**',
    ...operationSummaries,
  ];
  if (bodyDoc) {
    topDescribeParts.push('', bodyDoc);
  } else {
    topDescribeParts.push(
      '',
      'When the selected operation uses a JSON body, shape it according to that operation’s OpenAPI contract (declare `body` only for POST/PUT/PATCH/DELETE when applicable).'
    );
  }
  const topDescribe = topDescribeParts.join('\n');

  return z
    .object({
      operation_id: z
        .enum([head, ...tail] as [string, ...string[]])
        .describe(
          `Must be one of the configured operation ids: ${idList
            .map((id) => `\`${id}\``)
            .join(', ')}.`
        ),
      path: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Path parameters for the selected operation — each key replaces `{name}` in that operation's path template when the operation declares path params."
        ),
      query: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Query string parameters for the selected operation when applicable.'),
      body: z
        .unknown()
        .optional()
        .describe(
          'JSON body for the selected operation when the HTTP method expects a body. Shape is documented under **Request body** in the tool schema description (from OpenAPI).'
        ),
    })
    .describe(topDescribe);
}
