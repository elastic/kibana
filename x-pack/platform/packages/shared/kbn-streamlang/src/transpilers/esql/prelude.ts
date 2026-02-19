/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand } from '@kbn/esql-language';
import { Builder, BasicPrettyPrinter } from '@kbn/esql-language';

/**
 * Supported field types for ESQL prelude type casting.
 * These map to ES|QL cast operators (e.g., `field::integer`).
 */
export type PreludeFieldType =
  | 'keyword'
  | 'text'
  | 'match_only_text'
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'unsigned_long'
  | 'boolean'
  | 'date'
  | 'date_nanos'
  | 'ip'
  | 'version'
  | 'geo_point';

/**
 * A field definition for prelude generation.
 * Includes the field name and optionally its expected type.
 */
export interface PreludeField {
  /** Field name (e.g., 'attributes.foo') */
  name: string;
  /**
   * Field type for casting. If provided, an EVAL cast will be generated.
   * If omitted, only the INSIST_🐔 command is generated without type casting.
   */
  type?: PreludeFieldType;
}

/**
 * Options for generating the ESQL prelude.
 */
export interface PreludeOptions {
  /** Fields to include in the prelude with optional type information */
  fields: PreludeField[];
}

/**
 * Maps stream/mapping field types to ES|QL cast operator names.
 * Returns undefined for types that don't need explicit casting or aren't supported.
 */
function getEsqlCastOperator(type: PreludeFieldType): string | undefined {
  switch (type) {
    case 'keyword':
    case 'text':
    case 'match_only_text':
      return 'string';
    case 'long':
      return 'long';
    case 'integer':
    case 'short':
    case 'byte':
      return 'integer';
    case 'double':
    case 'float':
    case 'half_float':
      return 'double';
    case 'unsigned_long':
      return 'unsigned_long';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'date_nanos':
      return 'datetime';
    case 'ip':
      return 'ip';
    case 'version':
      return 'version';
    case 'geo_point':
      return 'geo_point';
    default:
      return undefined;
  }
}

/**
 * Generates INSIST_🐔 commands for the given fields.
 * INSIST_🐔 ensures the field exists in the schema for subsequent operations.
 *
 * @param fieldNames - List of field names to generate INSIST_🐔 commands for
 * @returns Array of ESQL AST commands
 */
export function generateInsistCommands(fieldNames: string[]): ESQLAstCommand[] {
  // Sort field names for deterministic output
  const sortedFieldNames = [...fieldNames].sort();

  return sortedFieldNames.map((fieldName) =>
    Builder.command({
      name: 'insist_🐔',
      args: [Builder.expression.column(fieldName)],
    })
  );
}

/**
 * Generates typed EVAL cast commands for fields with known types.
 * Uses the ES|QL inline cast operator syntax (e.g., `EVAL field = field::integer`).
 *
 * @param fields - List of fields with type information
 * @returns Array of ESQL AST commands for type casts
 */
export function generateTypedEvalCasts(fields: PreludeField[]): ESQLAstCommand[] {
  // Sort by field name for deterministic output
  const sortedFields = [...fields].sort((a, b) => a.name.localeCompare(b.name));

  const commands: ESQLAstCommand[] = [];

  for (const field of sortedFields) {
    if (!field.type) {
      continue;
    }

    const castOperator = getEsqlCastOperator(field.type);
    if (!castOperator) {
      continue;
    }

    const column = Builder.expression.column(field.name);

    // Build inline cast expression: field::type
    const castExpression = Builder.expression.inlineCast({
      value: column,
      castType: castOperator,
    });

    // Wrap in COALESCE(null, cast) to work around INSIST_🐔 bug
    // Without this, the cast fails when INSIST_🐔 adds a null-valued field
    const coalesceExpression = Builder.expression.func.call('coalesce', [
      Builder.expression.literal.nil(),
      castExpression,
    ]);

    commands.push(
      Builder.command({
        name: 'eval',
        args: [Builder.expression.func.binary('=', [column, coalesceExpression])],
      })
    );
  }

  return commands;
}

/**
 * Generates the complete ESQL prelude for draft stream execution.
 * The prelude consists of:
 * 1. INSIST_🐔 commands for each field (ensures field exists)
 * 2. EVAL casts for typed fields (ensures correct type)
 *
 * The order is deterministic (sorted by field name) to ensure consistent output.
 *
 * @example
 * ```typescript
 * const prelude = generatePrelude({
 *   fields: [
 *     { name: 'attributes.status', type: 'keyword' },
 *     { name: 'attributes.count', type: 'integer' },
 *   ],
 * });
 * // Returns commands for:
 * // | INSIST_🐔 `attributes.count`
 * // | INSIST_🐔 `attributes.status`
 * // | EVAL `attributes.count` = COALESCE(null, `attributes.count`::integer)
 * // | EVAL `attributes.status` = COALESCE(null, `attributes.status`::string)
 * ```
 *
 * @param options - Prelude generation options
 * @returns Object containing AST commands and formatted query string
 */
export function generatePrelude(options: PreludeOptions): {
  commands: ESQLAstCommand[];
  query: string;
} {
  const { fields } = options;

  if (fields.length === 0) {
    return { commands: [], query: '' };
  }

  const fieldNames = fields.map((f) => f.name);

  // Generate INSIST_🐔 commands first
  const insistCommands = generateInsistCommands(fieldNames);

  // Then generate typed EVAL casts
  const evalCasts = generateTypedEvalCasts(fields);

  const commands = [...insistCommands, ...evalCasts];

  // Format as query string
  const query = commands.length > 0 ? formatPreludeQuery(commands) : '';

  return { commands, query };
}

/**
 * Formats prelude commands into an ESQL query string fragment.
 * Each command is prefixed with a pipe separator.
 */
function formatPreludeQuery(commands: ESQLAstCommand[]): string {
  if (commands.length === 0) {
    return '';
  }

  const query = Builder.expression.query(commands);
  return BasicPrettyPrinter.multiline(query, { pipeTab: '  ' });
}
