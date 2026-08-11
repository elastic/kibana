/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ZodType } from '@kbn/zod/v4';

interface FieldDescription {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/**
 * Extracts a human-readable list of field descriptions from a Zod object schema
 * using the public `z.toJSONSchema()` API.
 *
 * Used to describe connector sub-action parameters to the agent LLM.
 */
export function describeZodSchema(schema: ZodType): FieldDescription[] {
  if (!schema) {
    return [];
  }

  try {
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    if (jsonSchema.type !== 'object' || !jsonSchema.properties) {
      return [];
    }

    const properties = jsonSchema.properties as Record<
      string,
      { type?: string; description?: string; default?: unknown }
    >;
    const required = new Set((jsonSchema.required as string[]) ?? []);

    return Object.entries(properties).map(([name, prop]) => ({
      name,
      type: prop.type ?? 'unknown',
      // A field is required for the caller only if it's in `required` AND has no default value
      required: required.has(name) && !('default' in prop),
      description: prop.description ?? undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Formats a Zod schema into a multi-line parameter summary string for LLM consumption.
 *
 * Example output:
 *   "- query (string, required): Search query to find messages\n- inChannel (string, optional): Channel name"
 */
export function formatSchemaForLlm(schema: ZodType): string {
  const fields = describeZodSchema(schema);
  if (fields.length === 0) {
    return 'No parameters';
  }

  return fields
    .map((field) => {
      const requiredLabel = field.required ? 'required' : 'optional';
      const desc = field.description ? `: ${field.description}` : '';
      return `- ${field.name} (${field.type}, ${requiredLabel})${desc}`;
    })
    .join('\n');
}
