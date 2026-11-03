/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_TEXT = 512;
const MAX_LONG_TEXT = 1000;
const MAX_FIELDS = 50;
const MAX_ACTIONS = 100;
const MAX_HEADERS = 100;
const MAX_BODY_ENTRIES = 100;
const MAX_BODY_DEPTH = 10;
const MAX_BODY_NODES = 500;
const RESERVED_IDENTIFIERS = new Set(['__proto__', 'constructor', 'prototype']);

export const connectorTypeIdSchema = lazySchema(() =>
  z
    .string()
    .max(127)
    .regex(/^[a-z0-9_-]+$/, 'Use only a-z, 0-9, "_" and "-".')
);

export const identifierSchema = lazySchema(() =>
  z
    .string()
    .max(64)
    .regex(
      /^[A-Za-z][A-Za-z0-9_]*$/,
      'Must start with a letter and use only letters, digits and "_".'
    )
    .refine((name) => !RESERVED_IDENTIFIERS.has(name), 'This identifier is reserved.')
);

export const fieldSchema = lazySchema(() =>
  z.object({
    name: identifierSchema,
    type: z.enum(['string', 'number', 'boolean']),
    required: z.boolean().default(false),
    label: z.string().max(MAX_TEXT).optional(),
    description: z.string().max(MAX_LONG_TEXT).optional(),
  })
);

const uniqueFieldNames = (fields: Array<{ name: string }>) =>
  new Set(fields.map(({ name }) => name)).size === fields.length;

const fieldsSchema = lazySchema(() =>
  z.array(fieldSchema).max(MAX_FIELDS).refine(uniqueFieldNames, {
    message: 'Field names must be unique.',
  })
);

export const authSchema = lazySchema(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('none') }).strict(),
    z.object({ type: z.literal('basic') }).strict(),
    z.object({ type: z.literal('bearer') }).strict(),
    z
      .object({
        type: z.literal('api_key_header'),
        headerName: z
          .string()
          .min(1)
          .max(128)
          .regex(/^[A-Za-z0-9-]+$/),
      })
      .strict(),
  ])
);

export const httpMethodSchema = lazySchema(() => z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']));

const templateSchema = (maxLength: number, allowSecret: boolean) =>
  z
    .string()
    .max(maxLength)
    .superRefine((value, context) => {
      const token = /{{\s*([^{}]+?)\s*}}/g;
      let match: RegExpExecArray | null;
      while ((match = token.exec(value)) !== null) {
        const reference = match[1].trim();
        const valid =
          /^(config|input)\.[A-Za-z][A-Za-z0-9_]*$/.test(reference) ||
          (allowSecret && /^secrets\.[A-Za-z][A-Za-z0-9_]*$/.test(reference));
        if (!valid)
          context.addIssue({
            code: 'custom',
            message: 'Template references must use a declared config, input, or secret identifier.',
          });
      }
      const stripped = value.replace(token, '');
      if (stripped.includes('{{') || stripped.includes('}}')) {
        context.addIssue({
          code: 'custom',
          message: 'Template braces must contain a valid reference.',
        });
      }
    });

export const urlTemplateSchema = lazySchema(() => templateSchema(2048, false).min(1));
export const pathTemplateSchema = lazySchema(() =>
  templateSchema(2048, false)
    .min(1)
    .refine(
      (path) => path.startsWith('/') && !path.startsWith('//') && !/[?#\\\u0000-\u001f]/.test(path),
      'Path must start with one slash and cannot contain a query or fragment.'
    )
);
export const headerNameSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9-]+$/)
);
export const headerTemplateSchema = lazySchema(() => templateSchema(MAX_TEXT, true));

const boundedJsonValue = (value: unknown, depth = 0, nodes = { count: 0 }): boolean => {
  nodes.count += 1;
  if (nodes.count > MAX_BODY_NODES || depth > MAX_BODY_DEPTH) return false;
  if (typeof value === 'string') return value.length <= MAX_LONG_TEXT;
  if (Array.isArray(value))
    return (
      value.length <= MAX_BODY_ENTRIES &&
      value.every((item) => boundedJsonValue(item, depth + 1, nodes))
    );
  if (typeof value === 'number') return Number.isFinite(value);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    return (
      entries.length <= MAX_BODY_ENTRIES &&
      entries.every(
        ([key, item]) =>
          key.length <= 128 &&
          !RESERVED_IDENTIFIERS.has(key) &&
          boundedJsonValue(item, depth + 1, nodes)
      )
    );
  }
  return value === null || typeof value === 'boolean';
};

const templateReferences = (value: string): string[] =>
  Array.from(value.matchAll(/{{\s*([^{}]+?)\s*}}/g), (match) => match[1].trim());

const stringValues = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value !== null && typeof value === 'object')
    return Object.values(value).flatMap(stringValues);
  return [];
};

export const requestTemplateSchema = lazySchema(() =>
  z
    .object({
      method: httpMethodSchema,
      url: urlTemplateSchema,
      path: pathTemplateSchema.optional(),
      headers: z
        .record(headerNameSchema, headerTemplateSchema)
        .refine((headers) => Object.keys(headers).length <= MAX_HEADERS, {
          message: `At most ${MAX_HEADERS} headers.`,
        })
        .optional(),
      body: z
        .record(z.string().max(128), z.unknown())
        .refine(boundedJsonValue, {
          message:
            'Request body must be JSON with bounded depth, nodes, entries, and string lengths.',
        })
        .optional(),
    })
    .strict()
);

export const actionSchema = lazySchema(() =>
  z
    .object({
      description: z.string().max(MAX_LONG_TEXT),
      scope: z.enum(['read', 'write', 'destroy']).default('write'),
      input: fieldsSchema,
      request: requestTemplateSchema,
    })
    .strict()
);

export const createConnectorTypeRequestSchema = lazySchema(() =>
  z
    .object({
      id: connectorTypeIdSchema,
      displayName: z.string().min(1).max(MAX_TEXT),
      description: z.string().max(MAX_LONG_TEXT),
      config: fieldsSchema,
      auth: authSchema,
      actions: z
        .record(identifierSchema, actionSchema)
        .refine((actions) => Object.keys(actions).length >= 1, {
          message: 'At least one action is required.',
        })
        .refine((actions) => Object.keys(actions).length <= MAX_ACTIONS, {
          message: `At most ${MAX_ACTIONS} actions.`,
        }),
    })
    .strict()
    .superRefine((request, context) => {
      const configNames = new Set(request.config.map(({ name }) => name));
      const authSecrets =
        request.auth.type === 'basic'
          ? new Set(['username', 'password'])
          : request.auth.type === 'bearer'
          ? new Set(['token'])
          : request.auth.type === 'api_key_header'
          ? new Set(['apiKey'])
          : new Set<string>();

      for (const [actionName, action] of Object.entries(request.actions)) {
        const inputNames = new Set(action.input.map(({ name }) => name));
        const values = [
          action.request.url,
          ...(action.request.path ? [action.request.path] : []),
          ...Object.values(action.request.headers ?? {}),
          ...stringValues(action.request.body),
        ];
        for (const value of values) {
          for (const reference of templateReferences(value)) {
            const [root, name] = reference.split('.');
            const declared =
              root === 'config'
                ? configNames.has(name)
                : root === 'input'
                ? inputNames.has(name)
                : root === 'secrets'
                ? authSecrets.has(name)
                : false;
            if (!declared) {
              context.addIssue({
                code: 'custom',
                path: ['actions', actionName, 'request'],
                message: `Template reference "${reference}" is not declared for this connector or action.`,
              });
            }
          }
        }
      }
    })
);

export type CreateConnectorTypeRequest = z.infer<typeof createConnectorTypeRequestSchema>;

export const createConnectorTypeResponseSchema = lazySchema(() =>
  z.object({
    id: z
      .string()
      .max(128)
      .regex(/^\.[a-z0-9_-]+$/),
  })
);
