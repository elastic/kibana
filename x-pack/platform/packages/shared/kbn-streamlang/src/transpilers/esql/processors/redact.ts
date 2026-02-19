/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import type { RedactProcessor } from '../../../../types/processors';
import { compileGrokPatternsToRegex } from '../../../../types/utils/grok_to_regex';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Default prefix and suffix used by ES redact processor.
 */
const DEFAULT_PREFIX = '<';
const DEFAULT_SUFFIX = '>';

/**
 * Converts a Streamlang RedactProcessor into a list of ES|QL AST commands.
 *
 * Since ES|QL doesn't have a native redact command, we emulate it using replace():
 * 1. Compile each Grok pattern (e.g., "%{IP:client}") to a regular expression
 * 2. For each pattern, generate an EVAL with replace() to mask the matched content
 * 3. The replacement is the semantic name wrapped in prefix/suffix (e.g., "<client>")
 *
 * For unconditional redaction (no 'where' or 'where: always'):
 *   Uses EVAL with replace() function for each pattern
 *
 * For conditional redaction (with 'where' condition):
 *   Uses EVAL with CASE for each pattern
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * @example Single pattern:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'redact',
 *          from: 'message',
 *          patterns: ['%{IP:client}'],
 *        } as RedactProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = replace(message, "<IP_REGEX>", "<client>")
 *    ```
 *
 * @example Multiple patterns with custom delimiters:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'redact',
 *          from: 'message',
 *          patterns: ['%{IP:client}', '%{EMAILADDRESS:email}'],
 *          prefix: '[',
 *          suffix: ']',
 *        } as RedactProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = replace(message, "<IP_REGEX>", "[client]")
 *    | EVAL message = replace(message, "<EMAIL_REGEX>", "[email]")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'redact',
 *          from: 'message',
 *          patterns: ['%{IP:client}'],
 *          where: { field: 'status', eq: 'production' },
 *        } as RedactProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = CASE(status == "production", replace(message, "<IP_REGEX>", "<client>"), message)
 *    ```
 */
export function convertRedactProcessorToESQL(processor: RedactProcessor): ESQLAstCommand[] {
  const {
    from,
    patterns,
    pattern_definitions,
    prefix = DEFAULT_PREFIX,
    suffix = DEFAULT_SUFFIX,
    ignore_missing = true, // default: true (unlike replace which defaults to false)
  } = processor;

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Compile Grok patterns to regex
  const compiledPatterns = compileGrokPatternsToRegex(patterns, pattern_definitions);

  if (compiledPatterns.length === 0) {
    // No valid patterns - return empty commands
    return commands;
  }

  const fromColumn = Builder.expression.column(from);

  // Check if this is conditional or unconditional redaction
  const isConditional = 'where' in processor && processor.where && !('always' in processor.where);

  // Generate an EVAL command for each pattern
  for (let i = 0; i < compiledPatterns.length; i++) {
    const { regex, semanticName } = compiledPatterns[i];
    const patternLiteral = Builder.expression.literal.string(regex);
    const replacementLiteral = Builder.expression.literal.string(
      `${prefix}${semanticName}${suffix}`
    );

    // Build replace() function call
    const replaceFunction = Builder.expression.func.call('replace', [
      fromColumn,
      patternLiteral,
      replacementLiteral,
    ]);

    if (isConditional) {
      // Conditional redaction: use EVAL with CASE
      // EVAL from = CASE(<condition>, replace(from, pattern, replacement), from)
      const conditionExpression = conditionToESQLAst(processor.where!);

      const caseExpression = Builder.expression.func.call('CASE', [
        conditionExpression,
        replaceFunction,
        fromColumn,
      ]);

      const evalCommand = Builder.command({
        name: 'eval',
        args: [Builder.expression.func.binary('=', [fromColumn, caseExpression])],
      });

      commands.push(evalCommand);
    } else {
      // Unconditional redaction: use EVAL with replace() function
      // EVAL from = replace(from, pattern, replacement)
      const evalCommand = Builder.command({
        name: 'eval',
        args: [Builder.expression.func.binary('=', [fromColumn, replaceFunction])],
      });

      commands.push(evalCommand);
    }
  }

  return commands;
}
