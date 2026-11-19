/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { Logger } from '@kbn/core/server';
import type {
  JsonSchemaType,
  JsonSchemaValidator,
  jsonSchemaValidator as JsonSchemaValidatorProvider,
} from '@modelcontextprotocol/sdk/validation/types.js';

/**
 * Validates MCP tool output against a tool's `outputSchema` using Zod.
 */
export class ZodJsonSchemaValidator implements JsonSchemaValidatorProvider {
  constructor(private readonly logger: Logger) {}

  /**
   * Builds a validator for a single JSON Schema. Called once per tool, so the
   * conversion happens here rather than inside the returned validator.
   */
  getValidator<T>(schema: JsonSchemaType): JsonSchemaValidator<T> {
    const zodSchema = fromJSONSchema(schema as Record<string, unknown>);

    if (!zodSchema) {
      // `fromJSONSchema` returns undefined for schemas it cannot represent (for example
      // `$ref` pointers). Skip validation rather than failing the whole tool listing:
      // the MCP server remains usable, and `callTool` does not surface the structured
      // content this schema describes anyway.
      this.logger.debug(
        `Unable to convert MCP tool output schema to Zod, skipping output validation: ${JSON.stringify(
          schema
        )}`
      );

      return (input: unknown) => ({ valid: true, data: input as T, errorMessage: undefined });
    }

    return (input: unknown) => {
      const result = zodSchema.safeParse(input);

      if (result.success) {
        return { valid: true, data: result.data as T, errorMessage: undefined };
      }

      return { valid: false, data: undefined, errorMessage: z.prettifyError(result.error) };
    };
  }
}
