/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { AuthTypeDef } from '@kbn/connector-specs';
import { z, ZodError, lazySchema } from '@kbn/zod/v4';
import type { DeclarativeConnectorSpec, DeclarativeJsonSchema } from './types';
import { DeclarativeConnectorSpecError } from './types';

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
      const hasUrl = request.url !== undefined;
      const hasBaseAndPath = request.baseUrl !== undefined && request.path !== undefined;
      if (hasUrl === hasBaseAndPath) {
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
    })
    .strict()
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

const normalizeAuthType = (authType: string | AuthTypeDef): AuthTypeDef =>
  typeof authType === 'string' ? { type: authType, defaults: {} } : authType;

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
      auth: connectorSpecAuthSchema,
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
    return {
      ...connector,
      auth: {
        types: connector.auth.types.map(normalizeAuthType),
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
