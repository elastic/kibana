/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ToolSchema } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';

/** Renders only named template slots, preserving braces inside substituted text. */
export const renderPrompt = (template: string, values: Record<string, string>): string =>
  template.replace(/\{([^{}]+)\}/g, (match, name: string) => values[name] ?? match);

/** Versions the complete prompt templates independently of example-specific substitutions. */
export const promptVersion = (...templates: string[]): string =>
  createHash('sha256').update(templates.join('\n')).digest('hex');

/** Converts runtime output validation to the inference client's object schema. */
export const toolSchema = (schema: z.ZodObject): ToolSchema => {
  const { properties, required } = z.toJSONSchema(schema, { io: 'input' });
  // The route supports the generated JSON Schema; ToolSchema's property type is narrower.
  return { type: 'object', properties, required } as ToolSchema;
};
