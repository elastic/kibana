/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * Licensed under the Elastic License 2.0.
 */

import { Parser } from '@kbn/esql-ast';
import type { ESQLAstQueryExpression, ESQLAstCommand, ESQLCommand, ESQLAstItem, ESQLColumn, ESQLLiteral } from '@kbn/esql-ast/src/types';
import type { StreamlangProcessorDefinition } from '../../../types/processors';

function isName(command: ESQLCommand, name: string) {
  return command.name?.toLowerCase() === name.toLowerCase();
}

function asColumn(arg: ESQLAstItem): ESQLColumn | undefined {
  return (arg as any)?.type === 'column' ? (arg as ESQLColumn) : undefined;
}

function asStringLiteral(arg: ESQLAstItem): string | undefined {
  const lit = (arg as any)?.type === 'literal' ? (arg as ESQLLiteral) : undefined;
  if (!lit) return undefined;
  // literal.text already contains quotes; use value if present, else strip quotes heuristically
  return (lit as any).value ?? String(lit.text).replace(/^"|"$/g, '');
}

export interface ReverseTranslationOptions {
  // reserved for future use
}

export function esqlToStreamlangProcessors(
  query: string,
  _opts: ReverseTranslationOptions = {}
): StreamlangProcessorDefinition[] {
  const { root } = Parser.parse(query);
  const processors: StreamlangProcessorDefinition[] = [];

  for (const cmd of (root as ESQLAstQueryExpression).commands) {
    const command = cmd as ESQLCommand;
    if (isName(command, 'grok')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        processors.push({ action: 'grok', from: field.text, patterns: [pattern] } as any);
      }
    } else if (isName(command, 'dissect')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        processors.push({ action: 'dissect', from: field.text, pattern } as any);
      }
    }
  }

  return processors;
}


