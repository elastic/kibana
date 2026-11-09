/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { AuthTypeDef } from '@kbn/connector-specs';
import { getAuthModeForAuthTypeId } from '@kbn/connector-specs';
import { authTypeSpecs } from '@kbn/connector-specs/server';
import { z, ZodError, lazySchema } from '@kbn/zod/v4';
import type {
  DeclarativeConnectorSpec,
  DeclarativeJsonSchema,
  DeclarativeRequest,
  DeclarativeTemplateRoot,
} from './types';
import { DeclarativeConnectorSpecError } from './types';

const TEMPLATE_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const TEMPLATE_ROOTS = new Set<DeclarativeTemplateRoot>(['input', 'config']);

const featureIdSchema = lazySchema(() => z.enum(['workflows', 'agentBuilder']));

const matchesSchemaType = (value: unknown, type: DeclarativeJsonSchema['type']): boolean => {
  switch (type) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    default: {
      const exhaustiveCheck: never = type;
      throw new DeclarativeConnectorSpecError(
        `Unsupported declarative schema type: ${exhaustiveCheck}`
      );
    }
  }
};

const jsonSchema: z.ZodType<DeclarativeJsonSchema> = z.lazy(() =>
  z
    .object({
      type: z.enum(['object', 'string', 'number', 'integer', 'boolean', 'array']),
      properties: z.record(z.string(), jsonSchema).optional(),
      required: z.array(z.string()).optional(),
      items: jsonSchema.optional(),
      format: z.enum(['uri', 'ipv4', 'date-time']).optional(),
      description: z.string().optional(),
      default: z.unknown().optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().nonnegative().optional(),
      enum: z
        .array(z.union([z.string(), z.number(), z.boolean()]))
        .min(1)
        .optional(),
      additionalProperties: z.boolean().optional(),
      xUi: z
        .object({
          label: z.string().optional(),
          placeholder: z.string().optional(),
          helpText: z.string().optional(),
          hidden: z.boolean().optional(),
          validate: z
            .object({
              allowedHosts: z.boolean().optional(),
            })
            .strict()
            .optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .superRefine((definition, context) => {
      const reportUnsupportedField = (
        field: keyof DeclarativeJsonSchema,
        supportedType: string
      ) => {
        if (definition[field] !== undefined && definition.type !== supportedType) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `"${field}" is only supported for ${supportedType} schemas.`,
          });
        }
      };
      const properties = definition.properties ?? {};
      if (definition.type === 'object') {
        for (const name of definition.required ?? []) {
          if (!(name in properties)) {
            context.addIssue({
              code: 'custom',
              path: ['required'],
              message: `Required field "${name}" has no property definition.`,
            });
          }
        }
      }
      reportUnsupportedField('properties', 'object');
      reportUnsupportedField('required', 'object');
      reportUnsupportedField('additionalProperties', 'object');
      reportUnsupportedField('items', 'array');
      reportUnsupportedField('format', 'string');
      reportUnsupportedField('minLength', 'string');
      reportUnsupportedField('maxLength', 'string');
      if (definition.type !== 'number' && definition.type !== 'integer') {
        if (definition.minimum !== undefined) {
          context.addIssue({
            code: 'custom',
            path: ['minimum'],
            message: '"minimum" is only supported for number or integer schemas.',
          });
        }
        if (definition.maximum !== undefined) {
          context.addIssue({
            code: 'custom',
            path: ['maximum'],
            message: '"maximum" is only supported for number or integer schemas.',
          });
        }
      }
      if (
        definition.default !== undefined &&
        !matchesSchemaType(definition.default, definition.type)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['default'],
          message: `Default value must match type "${definition.type}".`,
        });
      }
      for (const [index, value] of (definition.enum ?? []).entries()) {
        if (!matchesSchemaType(value, definition.type)) {
          context.addIssue({
            code: 'custom',
            path: ['enum', index],
            message: `Enum value must match type "${definition.type}".`,
          });
        }
      }
    })
);

const httpRequestSchema = lazySchema(() =>
  z
    .object({
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      url: z.string().optional(),
      baseUrl: z.string().optional(),
      path: z.string().optional(),
      query: z.record(z.string(), z.unknown()).optional(),
      headers: z.record(z.string(), z.unknown()).optional(),
      body: z.unknown().optional(),
    })
    .strict()
    .superRefine((request, context) => {
      const { url, baseUrl, path } = request;
      const isValid =
        url !== undefined
          ? baseUrl === undefined && path === undefined
          : baseUrl !== undefined && path !== undefined;
      if (!isValid) {
        context.addIssue({
          code: 'custom',
          message: 'Provide either url or baseUrl with path.',
        });
      }
    })
);

const authTypeIdSchema = lazySchema(() => z.string().min(1).max(128));

const authTypeDefinitionSchema = lazySchema(() =>
  z
    .object({
      type: authTypeIdSchema,
      isRecommended: z.boolean().optional(),
      isLegacy: z.boolean().optional(),
      isExperimental: z.boolean().optional(),
      supportsSandbox: z.boolean().optional(),
      defaults: z.record(z.string(), z.unknown()),
      overrides: z
        .object({
          label: z.string().max(256).optional(),
          meta: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
        })
        .strict()
        .optional(),
      prefix: z.string().max(128).optional(),
    })
    .strict()
    .superRefine((authType, context) => {
      if (authType.prefix !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['prefix'],
          message:
            'auth.prefix is not supported. Auth values are applied by the auth type, not a prefix.',
        });
      }
    })
);

const legacyAuthSchema = lazySchema(() =>
  z
    .object({
      type: authTypeIdSchema,
      header: z.string().min(1).max(256).optional(),
      prefix: z.string().max(128).optional(),
      label: z.string().max(256).optional(),
      placeholder: z.string().max(256).optional(),
    })
    .strict()
    .superRefine((auth, context) => {
      if (auth.prefix !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['prefix'],
          message:
            'auth.prefix is not supported. Auth values are applied by the auth type, not a prefix.',
        });
      }
      if (auth.type === 'api_key_header' && !auth.header) {
        context.addIssue({
          code: 'custom',
          message: 'api_key_header requires a header.',
        });
      }
    })
);

const connectorSpecAuthSchema = lazySchema(() =>
  z
    .object({
      types: z
        .array(z.union([authTypeIdSchema, authTypeDefinitionSchema]))
        .min(1)
        .max(16),
    })
    .strict()
);

interface ParsedAuthTypeDef {
  type: string;
  isRecommended?: boolean;
  isLegacy?: boolean;
  isExperimental?: boolean;
  supportsSandbox?: boolean;
  defaults: Record<string, unknown>;
  overrides?: AuthTypeDef['overrides'];
  prefix?: string;
}

interface ParsedLegacyAuth {
  type: string;
  header?: string;
  prefix?: string;
  label?: string;
  placeholder?: string;
}

const assertSupportedAuthType = (typeId: string): void => {
  const spec = Object.values(authTypeSpecs).find((candidate) => candidate.id === typeId);
  if (!spec) {
    throw new DeclarativeConnectorSpecError(
      `Auth type "${typeId}" is not registered in this Kibana version.`
    );
  }
  if (getAuthModeForAuthTypeId(typeId) !== 'shared') {
    throw new DeclarativeConnectorSpecError(
      `Auth type "${typeId}" is not supported. Declarative connectors only accept shared auth types.`
    );
  }
  if (spec.usesRelayTransport) {
    throw new DeclarativeConnectorSpecError(
      `Auth type "${typeId}" is not supported. Declarative connectors cannot use relay transport.`
    );
  }
};

const toAuthTypeDef = (authType: string | ParsedAuthTypeDef): AuthTypeDef => {
  if (typeof authType === 'string') {
    return { type: authType, defaults: {} };
  }
  return {
    type: authType.type,
    defaults: authType.defaults,
    ...(authType.isRecommended !== undefined ? { isRecommended: authType.isRecommended } : {}),
    ...(authType.isLegacy !== undefined ? { isLegacy: authType.isLegacy } : {}),
    ...(authType.isExperimental !== undefined ? { isExperimental: authType.isExperimental } : {}),
    ...(authType.supportsSandbox !== undefined
      ? { supportsSandbox: authType.supportsSandbox }
      : {}),
    ...(authType.overrides !== undefined ? { overrides: authType.overrides } : {}),
  };
};

const normalizeLegacyAuth = (auth: ParsedLegacyAuth): AuthTypeDef[] => {
  if (auth.prefix !== undefined) {
    throw new DeclarativeConnectorSpecError(
      'auth.prefix is not supported. Auth values are applied by the auth type, not a prefix.'
    );
  }
  if (auth.type === 'api_key_header') {
    return [
      {
        type: 'api_key_header',
        defaults: { headerField: auth.header },
        ...(auth.label || auth.placeholder
          ? {
              overrides: {
                meta: {
                  [auth.header ?? '']: {
                    ...(auth.label ? { label: auth.label } : {}),
                    ...(auth.placeholder ? { placeholder: auth.placeholder } : {}),
                  },
                },
              },
            }
          : {}),
      },
    ];
  }
  return [{ type: auth.type, defaults: {} }];
};

const normalizeAuth = (
  auth: { types: Array<string | ParsedAuthTypeDef> } | ParsedLegacyAuth
): AuthTypeDef[] => {
  if ('types' in auth) {
    return auth.types.map((authType) => {
      if (typeof authType !== 'string' && authType.prefix !== undefined) {
        throw new DeclarativeConnectorSpecError(
          'auth.prefix is not supported. Auth values are applied by the auth type, not a prefix.'
        );
      }
      return toAuthTypeDef(authType);
    });
  }
  return normalizeLegacyAuth(auth);
};

const collectTemplatePaths = (value: unknown, found: string[] = []): string[] => {
  if (typeof value === 'string') {
    for (const match of value.matchAll(TEMPLATE_PATTERN)) {
      found.push(match[1]);
    }
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTemplatePaths(item, found);
    }
    return found;
  }
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectTemplatePaths(nested, found);
    }
  }
  return found;
};

const requestTemplateValue = (request: DeclarativeRequest): unknown => ({
  url: request.url,
  baseUrl: request.baseUrl,
  path: request.path,
  query: request.query,
  headers: request.headers,
  body: request.body,
});

const collectTemplateRoots = (request: DeclarativeRequest): string[] =>
  collectTemplatePaths(requestTemplateValue(request)).map(
    (templatePath) => templatePath.split('.')[0]
  );

const assertTemplateRoots = (actionName: string, request: DeclarativeRequest): void => {
  const templatePaths = collectTemplatePaths(requestTemplateValue(request));
  const roots = collectTemplateRoots(request);
  for (const [index, templatePath] of templatePaths.entries()) {
    const root = roots[index];
    const segments = templatePath.split('.').slice(1);
    if (!TEMPLATE_ROOTS.has(root as DeclarativeTemplateRoot)) {
      throw new DeclarativeConnectorSpecError(
        `Action "${actionName}" template "{{ ${templatePath} }}" may only read from input or config.`
      );
    }
    for (const segment of segments) {
      if (UNSAFE_PATH_SEGMENTS.has(segment)) {
        throw new DeclarativeConnectorSpecError(
          `Action "${actionName}" template "{{ ${templatePath} }}" contains unsafe path segment "${segment}".`
        );
      }
    }
  }
};

const connectorSpecSchema = lazySchema(() =>
  z
    .object({
      schemaVersion: z.literal(1),
      id: z.string().regex(/^\.[a-z0-9_-]+$/),
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      metadata: z
        .object({
          displayName: z.string().min(1),
          icon: z
            .object({
              path: z.string().min(1).max(512),
              contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
            })
            .strict()
            .optional(),
          description: z.string().min(1),
          docsUrl: z.string().optional(),
          minimumLicense: z.enum(['basic', 'gold', 'platinum', 'enterprise']),
          isTechnicalPreview: z.boolean().optional(),
          supportedFeatureIds: z.array(featureIdSchema).min(1),
        })
        .strict(),
      config: jsonSchema,
      auth: z.union([connectorSpecAuthSchema, legacyAuthSchema]),
      actions: z
        .record(
          z.string(),
          z
            .object({
              description: z.string().optional(),
              isTool: z.boolean().optional(),
              scope: z.enum(['read', 'write', 'destroy']).optional(),
              input: jsonSchema,
              request: httpRequestSchema,
            })
            .strict()
        )
        .refine((actions) => Object.keys(actions).length > 0, 'At least one action is required.'),
      test: z
        .object({
          description: z.string().optional(),
          request: httpRequestSchema,
        })
        .strict(),
    })
    .strict()
);

const formatIssues = (error: ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join(', ');

/** Parses a schemaVersion 1 YAML catalog contract into a declarative connector spec. */
export const parseDeclarativeConnectorSpec = (raw: string): DeclarativeConnectorSpec => {
  let parsed: unknown;
  try {
    parsed = parseYaml(raw, { maxAliasCount: 100 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new DeclarativeConnectorSpecError(
      `Declarative connector definition is not valid YAML: ${detail}`
    );
  }

  try {
    const connector = connectorSpecSchema.parse(parsed);
    const authTypes = normalizeAuth(connector.auth);
    for (const authType of authTypes) {
      assertSupportedAuthType(authType.type);
    }
    for (const [actionName, action] of Object.entries(connector.actions)) {
      assertTemplateRoots(actionName, action.request);
    }
    assertTemplateRoots('test', connector.test.request);
    return {
      ...connector,
      auth: {
        types: authTypes,
      },
    };
  } catch (error) {
    if (error instanceof DeclarativeConnectorSpecError) {
      throw error;
    }
    if (error instanceof ZodError) {
      throw new DeclarativeConnectorSpecError(
        `Declarative connector definition is invalid: ${formatIssues(error)}`
      );
    }
    throw new DeclarativeConnectorSpecError(
      `Declarative connector definition is invalid: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
