/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'yaml';
import { z, ZodError } from '@kbn/zod/v4';
import type {
  DeclarativeCatalogManifest,
  DeclarativeConnectorSpec,
  DeclarativeJsonSchema,
} from './types';

const featureIdSchema = z.enum([
  'alerting',
  'cases',
  'uptime',
  'siem',
  'generativeAIForSecurity',
  'generativeAIForObservability',
  'generativeAIForSearchPlayground',
  'endpointSecurity',
  'workflows',
  'agentBuilder',
  'contextEngine',
]);

const contentHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const relativeAssetPathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (path) => !path.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(path),
    'Asset paths must be relative to the connector definition.'
  );

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
      throw new Error(`Unsupported declarative schema type: ${exhaustiveCheck}`);
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
        reportUnsupportedField('minimum', 'number or integer');
        reportUnsupportedField('maximum', 'number or integer');
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

const retrySchema = z
  .object({
    statusCodes: z.array(z.number().int().min(100).max(599)),
    maxAttempts: z.number().int().min(1).max(5),
    initialDelayMs: z.number().int().nonnegative().max(30_000).optional(),
    maxDelayMs: z.number().int().positive().max(60_000).optional(),
  })
  .strict();

const requestSchema = z
  .object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    url: z.string().optional(),
    baseUrl: z.string().optional(),
    path: z.string().optional(),
    query: z.record(z.string(), z.unknown()).optional(),
    headers: z.record(z.string(), z.unknown()).optional(),
    body: z.unknown().optional(),
    bodyType: z.enum(['json', 'form', 'text']).optional(),
    retry: retrySchema.optional(),
    pagination: z
      .object({
        strategy: z.literal('link_header'),
        header: z.string().optional(),
        maxPages: z.number().int().min(1).max(100),
        itemsPath: z.string().optional(),
        outputKey: z.string().min(1),
      })
      .strict()
      .optional(),
    response: z
      .object({
        dataPath: z.string().optional(),
        outputKey: z.string().optional(),
        rateLimitHeaders: z
          .object({
            remaining: z.string().optional(),
            reset: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((request, context) => {
    const hasUrl = request.url !== undefined;
    const hasBaseAndPath = request.baseUrl !== undefined && request.path !== undefined;
    if (hasUrl === hasBaseAndPath) {
      context.addIssue({
        code: 'custom',
        message: 'Provide either url or baseUrl with path.',
      });
    }
  });

const authTypeIdSchema = z.string().min(1).max(128);

const authTypeDefinitionSchema = z
  .object({
    type: authTypeIdSchema,
    isRecommended: z.boolean().optional(),
    isLegacy: z.boolean().optional(),
    isExperimental: z.boolean().optional(),
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
  .strict();

const connectorSpecAuthSchema = z
  .object({
    types: z
      .array(z.union([authTypeIdSchema, authTypeDefinitionSchema]))
      .min(1)
      .max(16),
  })
  .strict();

const legacyAuthSchema = z
  .object({
    type: authTypeIdSchema,
    header: z.string().optional(),
    prefix: z.string().max(128).optional(),
    label: z.string().max(256).optional(),
    placeholder: z.string().max(256).optional(),
  })
  .strict()
  .superRefine((auth, context) => {
    if (auth.type === 'api_key_header' && !auth.header) {
      context.addIssue({
        code: 'custom',
        message: 'api_key_header requires a header.',
      });
    }
  })
  .transform(({ type, header, prefix, label, placeholder }) => {
    if (type !== 'api_key_header' || !header) {
      return { types: [type] };
    }
    return {
      types: [
        {
          type,
          defaults: { headerField: header },
          ...(prefix ? { prefix } : {}),
          ...(label || placeholder
            ? {
                overrides: {
                  meta: {
                    [header]: {
                      ...(label ? { label } : {}),
                      ...(placeholder ? { placeholder } : {}),
                    },
                  },
                },
              }
            : {}),
        },
      ],
    };
  });

const connectorSpecSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^\.[a-z0-9_-]+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    metadata: z
      .object({
        displayName: z.string().min(1),
        icon: z
          .object({
            path: relativeAssetPathSchema,
            contentHash: contentHashSchema,
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
            request: requestSchema,
          })
          .strict()
      )
      .refine((actions) => Object.keys(actions).length > 0, 'At least one action is required.'),
    test: z
      .object({
        description: z.string().optional(),
        request: requestSchema,
      })
      .strict(),
  })
  .strict();

const catalogManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    catalogVersion: z.string().min(1),
    activeVersions: z
      .record(z.string().regex(/^\.[a-z0-9_-]+$/), z.string().regex(/^\d+\.\d+\.\d+$/))
      .refine(
        (versions) => Object.keys(versions).length > 0,
        'At least one active version is required.'
      ),
    connectors: z
      .array(
        z
          .object({
            id: z.string().regex(/^\.[a-z0-9_-]+$/),
            version: z.string().regex(/^\d+\.\d+\.\d+$/),
            definitionUrl: z.string().min(1),
            contentHash: contentHashSchema,
          })
          .strict()
      )
      .min(1),
  })
  .strict();

const formatIssues = (error: ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join(', ');

export const parseDeclarativeConnectorSpec = (raw: string): DeclarativeConnectorSpec => {
  let parsed: unknown;
  try {
    parsed = yaml.parse(raw);
  } catch (error) {
    throw new Error('Declarative connector definition is not valid YAML.', { cause: error });
  }

  try {
    return connectorSpecSchema.parse(parsed) as DeclarativeConnectorSpec;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Declarative connector definition is invalid: ${formatIssues(error)}`, {
        cause: error,
      });
    }
    throw error;
  }
};

export const parseDeclarativeCatalogManifest = (value: unknown): DeclarativeCatalogManifest => {
  try {
    return catalogManifestSchema.parse(value) as DeclarativeCatalogManifest;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Declarative connector catalog is invalid: ${formatIssues(error)}`, {
        cause: error,
      });
    }
    throw error;
  }
};
