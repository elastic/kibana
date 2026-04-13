/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaApiOperationConfig } from '@kbn/agent-builder-common/tools';
import type { KibanaOpenApiIndexedOperation } from './openapi_kibana_catalog';

function pathTemplateParamNames(pathTemplate: string): string[] {
  const names: string[] = [];
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathTemplate)) !== null) {
    names.push(m[1]);
  }
  return names;
}

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

function openApiDocsFromSchemaNode(root: Record<string, unknown>, schemaNode: unknown): string {
  const node = deref(root, schemaNode) as Record<string, unknown> | null;
  if (!node || typeof node !== 'object') {
    return '';
  }
  const title = typeof node.title === 'string' ? node.title.trim() : '';
  const description = typeof node.description === 'string' ? node.description.trim() : '';
  if (title && description) {
    return `${title}: ${description}`;
  }
  return title || description;
}

function withOpenApiFieldDocs(
  root: Record<string, unknown>,
  schemaNode: unknown,
  zodType: z.ZodTypeAny
): z.ZodTypeAny {
  const doc = openApiDocsFromSchemaNode(root, schemaNode);
  return doc ? zodType.describe(doc) : zodType;
}

/**
 * OpenAPI often composes request bodies with `allOf: [ { $ref: ... }, { type: object, properties: { id: ... } } ]`.
 * Taking only the first branch drops required top-level fields (e.g. `id`) after Zod parse.
 */
function mergeAllOfObjectBranches(
  root: Record<string, unknown>,
  branches: unknown[]
): { type: 'object'; properties: Record<string, unknown>; required: string[] } | null {
  const mergedProps: Record<string, unknown> = {};
  const mergedRequired = new Set<string>();
  let hasProps = false;

  for (const branch of branches) {
    const resolved = deref(root, branch) as Record<string, unknown> | null;
    if (!resolved || typeof resolved !== 'object') {
      continue;
    }

    if (Array.isArray(resolved.allOf) && resolved.allOf.length > 0) {
      const nested = mergeAllOfObjectBranches(root, resolved.allOf as unknown[]);
      if (nested?.properties && Object.keys(nested.properties).length > 0) {
        hasProps = true;
        Object.assign(mergedProps, nested.properties);
        for (const r of nested.required) {
          mergedRequired.add(r);
        }
      }
    }

    const props = resolved.properties as Record<string, unknown> | undefined;
    if (props && typeof props === 'object' && Object.keys(props).length > 0) {
      hasProps = true;
      Object.assign(mergedProps, props);
    }
    if (Array.isArray(resolved.required)) {
      for (const r of resolved.required as string[]) {
        mergedRequired.add(r);
      }
    }
  }

  if (!hasProps || Object.keys(mergedProps).length === 0) {
    return null;
  }

  return {
    type: 'object',
    properties: mergedProps,
    required: [...mergedRequired],
  };
}

function jsonSchemaToZod(root: Record<string, unknown>, schema: unknown): z.ZodTypeAny {
  const resolved = deref(root, schema) as Record<string, unknown> | null;
  if (!resolved || typeof resolved !== 'object') {
    return withOpenApiFieldDocs(root, schema, z.any());
  }

  if (Array.isArray(resolved.allOf) && resolved.allOf.length > 0) {
    const merged = mergeAllOfObjectBranches(root, resolved.allOf as unknown[]);
    if (merged) {
      return jsonSchemaToZod(root, merged);
    }
    return withOpenApiFieldDocs(root, schema, jsonSchemaToZod(root, resolved.allOf[0]));
  }

  if (Array.isArray(resolved.oneOf) && resolved.oneOf.length > 0) {
    return withOpenApiFieldDocs(root, schema, jsonSchemaToZod(root, resolved.oneOf[0]));
  }
  if (Array.isArray(resolved.anyOf) && resolved.anyOf.length > 0) {
    return withOpenApiFieldDocs(root, schema, jsonSchemaToZod(root, resolved.anyOf[0]));
  }

  const t = resolved.type;
  if (t === 'string') {
    if (
      Array.isArray(resolved.enum) &&
      resolved.enum.length > 0 &&
      resolved.enum.every((x) => typeof x === 'string')
    ) {
      const strs = resolved.enum as string[];
      if (strs.length === 1) {
        return withOpenApiFieldDocs(root, schema, z.literal(strs[0]));
      }
      return withOpenApiFieldDocs(root, schema, z.enum(strs as [string, ...string[]]));
    }
    return withOpenApiFieldDocs(root, schema, z.string());
  }
  if (t === 'number') {
    return withOpenApiFieldDocs(root, schema, z.number());
  }
  if (t === 'integer') {
    return withOpenApiFieldDocs(root, schema, z.number().int());
  }
  if (t === 'boolean') {
    return withOpenApiFieldDocs(root, schema, z.boolean());
  }
  if (t === 'array') {
    const items = resolved.items;
    if (items) {
      return withOpenApiFieldDocs(root, schema, z.array(jsonSchemaToZod(root, items)));
    }
    return withOpenApiFieldDocs(root, schema, z.array(z.unknown()));
  }
  if (t === 'object') {
    const props = resolved.properties as Record<string, unknown> | undefined;
    if (props) {
      const req = new Set(Array.isArray(resolved.required) ? (resolved.required as string[]) : []);
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, propSchema] of Object.entries(props)) {
        let field = jsonSchemaToZod(root, propSchema);
        if (!req.has(key)) {
          field = field.optional();
        }
        shape[key] = field;
      }
      // OpenAPI often uses oneOf/allOf or omits fields; stripping unknown keys breaks real APIs.
      return withOpenApiFieldDocs(root, schema, z.object(shape).passthrough());
    }
    if (resolved.additionalProperties) {
      return withOpenApiFieldDocs(root, schema, z.record(z.string(), z.unknown()));
    }
    return withOpenApiFieldDocs(root, schema, z.record(z.string(), z.unknown()));
  }
  return withOpenApiFieldDocs(root, schema, z.unknown());
}

function resolveParameters(
  root: Record<string, unknown>,
  parameters: unknown[]
): Array<{
  name: string;
  in: string;
  required: boolean;
  schema?: unknown;
  description?: string;
}> {
  const out: Array<{
    name: string;
    in: string;
    required: boolean;
    schema?: unknown;
    description?: string;
  }> = [];
  for (const raw of parameters) {
    const p = deref(root, raw) as Record<string, unknown>;
    const name = typeof p.name === 'string' ? p.name : '';
    const inn = typeof p.in === 'string' ? p.in : '';
    if (!name || !inn) {
      continue;
    }
    const required = Boolean(p.required);
    const schema = p.schema;
    const description = typeof p.description === 'string' ? p.description.trim() : undefined;
    out.push({ name, in: inn, required, schema, description });
  }
  return out;
}

function describePathParam(name: string, openApiDescription?: string): string {
  const bits = [
    openApiDescription,
    `Substitutes \`{${name}}\` in the operation path template (URL segment).`,
  ].filter(Boolean);
  return bits.join(' ');
}

function describeQueryParam(name: string, openApiDescription?: string): string {
  const bits = [openApiDescription, `Query string key \`${name}\`.`].filter(Boolean);
  return bits.join(' ');
}

const METHODS_THAT_MAY_SEND_JSON_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const MAX_OPENAPI_BODY_SCHEMA_CHARS = 12_000;

/**
 * Request bodies in oas_docs often use `oneOf` / `allOf` / `$ref` trees. A strict `jsonSchemaToZod`
 * parse can drop fields (e.g. `id`) even with `.passthrough()`. We validate body as a loose record and
 * attach the OpenAPI schema as documentation for the model.
 */
function describeHttpJsonBodyFromOpenApi(opts: {
  methodUpper: string;
  pathTemplate: string;
  jsonSchema?: unknown;
  hasJsonSchema: boolean;
  bodyRequired: boolean;
}): string {
  const base = `Raw JSON object for the HTTP request body of ${opts.methodUpper} \`${opts.pathTemplate}\`. Every key you include is forwarded unchanged to Kibana (no field is dropped by the tool).`;
  if (!opts.hasJsonSchema || opts.jsonSchema === undefined) {
    return `${base} (${opts.bodyRequired ? 'required' : 'optional'}).`;
  }
  let excerpt: string;
  try {
    excerpt = JSON.stringify(opts.jsonSchema, null, 2);
  } catch {
    excerpt = String(opts.jsonSchema);
  }
  if (excerpt.length > MAX_OPENAPI_BODY_SCHEMA_CHARS) {
    excerpt = `${excerpt.slice(0, MAX_OPENAPI_BODY_SCHEMA_CHARS)}…`;
  }
  return `${base}\n\nOpenAPI \`application/json\` schema (reference — include required fields such as \`id\` when the API expects them):\n${excerpt}\n\n(${
    opts.bodyRequired ? 'required' : 'optional'
  }).`;
}

/**
 * Zod schema for tool call arguments. Only includes `path`, `query`, and/or `body` when the OpenAPI
 * operation actually uses them, so the model is not forced to pass empty objects.
 */
export function buildKibanaApiToolParamsSchema(
  root: Record<string, unknown>,
  indexed: KibanaOpenApiIndexedOperation
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const op = indexed.operation;
  const pathTemplate = indexed.path_template;
  const methodUpper = indexed.method.toUpperCase();

  const rawParams = Array.isArray(op.parameters) ? op.parameters : [];
  const resolvedParams = resolveParameters(root, rawParams as unknown[]);

  const pathParamDefs = resolvedParams.filter((p) => p.in === 'path');
  const queryParamDefs = resolvedParams.filter((p) => p.in === 'query');

  const pathShape: Record<string, z.ZodTypeAny> = {};
  for (const name of pathTemplateParamNames(pathTemplate)) {
    const def = pathParamDefs.find((p) => p.name === name);
    let zField = def?.schema ? jsonSchemaToZod(root, def.schema) : z.string();
    zField = zField.describe(describePathParam(name, def?.description));
    pathShape[name] = zField;
  }

  const queryShape: Record<string, z.ZodTypeAny> = {};
  for (const q of queryParamDefs) {
    let zField = q.schema ? jsonSchemaToZod(root, q.schema) : z.string();
    zField = zField.describe(describeQueryParam(q.name, q.description));
    if (!q.required) {
      zField = zField.optional();
    }
    queryShape[q.name] = zField;
  }

  const requestBody = deref(root, op.requestBody) as Record<string, unknown> | undefined;
  const content =
    requestBody && typeof requestBody === 'object'
      ? (requestBody.content as Record<string, { schema?: unknown }> | undefined)
      : undefined;
  const jsonBody = content?.['application/json'];
  const hasDeclaredRequestBody = Boolean(requestBody && typeof requestBody === 'object');
  const hasJsonSchemaBody = Boolean(jsonBody?.schema);

  const mayHaveBody = METHODS_THAT_MAY_SEND_JSON_BODY.has(methodUpper);
  const needsBody =
    mayHaveBody && (hasJsonSchemaBody || (hasDeclaredRequestBody && Boolean(jsonBody)));

  let bodyZod: z.ZodTypeAny | undefined;
  if (needsBody) {
    const bodyRequired = Boolean(requestBody && (requestBody as { required?: boolean }).required);
    const bodyDescribe = describeHttpJsonBodyFromOpenApi({
      methodUpper,
      pathTemplate,
      jsonSchema: hasJsonSchemaBody ? jsonBody!.schema : undefined,
      hasJsonSchema: hasJsonSchemaBody,
      bodyRequired,
    });
    let inner: z.ZodTypeAny = z.record(z.string(), z.unknown()).describe(bodyDescribe);
    if (!bodyRequired) {
      inner = inner.optional();
    }
    bodyZod = inner;
  }

  const hasPath = Object.keys(pathShape).length > 0;
  const hasQuery = Object.keys(queryShape).length > 0;

  const pathZod = hasPath
    ? z
        .object(pathShape)
        .describe('Path parameters — each value replaces the matching `{name}` in the API path.')
    : undefined;

  const queryZod = hasQuery
    ? z.object(queryShape).describe('Query string parameters for this operation.')
    : undefined;

  const shape: Record<string, z.ZodTypeAny> = {};
  if (pathZod) {
    shape.path = pathZod;
  }
  if (queryZod) {
    shape.query = queryZod;
  }
  if (bodyZod) {
    shape.body = bodyZod;
  }

  const opSummary =
    typeof op.summary === 'string'
      ? op.summary.trim()
      : typeof op.description === 'string'
      ? op.description.trim().slice(0, 240)
      : '';

  const topDescribeParts = [
    `Kibana REST call: ${methodUpper} \`${pathTemplate}\`.`,
    opSummary ? `API summary: ${opSummary}` : '',
    !hasPath && !hasQuery && !bodyZod
      ? 'This operation takes no path, query, or JSON body arguments — call with an empty object {}.'
      : '',
  ].filter(Boolean);

  if (Object.keys(shape).length === 0) {
    return z.object({}).describe(topDescribeParts.join('\n') || 'Kibana API tool parameters.');
  }

  return z.object(shape).describe(topDescribeParts.join('\n'));
}

export interface KibanaApiIndexedOperationEntry {
  operation: KibanaApiOperationConfig;
  indexed: KibanaOpenApiIndexedOperation;
}

/**
 * Builds a Zod input schema for calling one of several configured OpenAPI operations.
 * Multiple operations use one object schema with **operation_id** plus optional **path** / **query**
 * / **body** (Bedrock-safe root `type: "object"`). A single configured operation still uses a
 * merged object with a literal **operation_id** and OpenAPI-typed fields where available.
 */
export function buildKibanaApiMultiOperationToolParamsSchema(
  root: Record<string, unknown>,
  entries: KibanaApiIndexedOperationEntry[]
): z.ZodType {
  if (entries.length === 0) {
    return z.object({}).describe('No Kibana API operations are configured for this tool.');
  }

  const branchForEntry = (entry: KibanaApiIndexedOperationEntry) => {
    const { operation, indexed } = entry;
    const inner = buildKibanaApiToolParamsSchema(root, indexed);
    const op = indexed.operation;
    const apiSummary =
      typeof op.summary === 'string'
        ? op.summary.trim()
        : typeof op.description === 'string'
        ? op.description.trim().slice(0, 200)
        : '';

    const opDescribe = [
      `Use this **operation_id** to execute \`${indexed.method} ${indexed.path_template}\`.`,
      apiSummary ? `Summary: ${apiSummary}` : '',
      `OpenAPI operationId: \`${operation.operation_id}\`.`,
      `Only include \`path\`, \`query\`, and \`body\` keys that exist on this branch — they match this operation's OpenAPI contract.`,
    ]
      .filter(Boolean)
      .join('\n');

    return z
      .object({
        operation_id: z.literal(operation.operation_id).describe(opDescribe),
      })
      .merge(inner);
  };

  if (entries.length === 1) {
    const { indexed, operation } = entries[0]!;
    const methodUpper = indexed.method.toUpperCase();
    return branchForEntry(entries[0]!).describe(
      `Calls one Kibana REST operation: ${methodUpper} \`${indexed.path_template}\`. **operation_id** must be \`${operation.operation_id}\`; supply path/query/body only as required for that operation (see field descriptions).`
    );
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

  const topDescribe = [
    `This tool exposes **${entries.length}** Kibana REST operations from the OpenAPI catalog.`,
    'Set **operation_id** to the exact id of the operation to run, then include only the **path**, **query**, and/or **body** fields that operation expects (see OpenAPI for each id below).',
    '',
    '**Configured operations**',
    ...operationSummaries,
  ].join('\n');

  /**
   * Use a single top-level object schema (not `z.discriminatedUnion`) so JSON Schema for tool
   * parameters keeps root `{ "type": "object" }`. Some inference providers (e.g. Amazon Bedrock
   * Converse) reject root `oneOf` / missing object type; runtime validation still happens in the
   * tool handler via the operation allowlist and OpenAPI-backed request build.
   */
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
          "JSON body for the selected operation when the HTTP method expects a body. Values are forwarded to Kibana as JSON (include keys required by that operation's OpenAPI contract)."
        ),
    })
    .describe(topDescribe);
}
