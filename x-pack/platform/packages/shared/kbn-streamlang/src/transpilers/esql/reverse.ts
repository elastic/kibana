/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * Licensed under the Elastic License 2.0.
 */

import { Parser } from '@kbn/esql-ast';
import type {
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLAstItem,
  ESQLColumn,
  ESQLLiteral,
  ESQLSingleAstItem,
  ESQLFunction,
} from '@kbn/esql-ast/src/types';
import type {
  StreamlangProcessorDefinition,
  GrokProcessor,
  DissectProcessor,
  SetProcessor,
  DateProcessor,
  RenameProcessor,
} from '../../../types/processors';
import type { StreamlangStep } from '../../../types/streamlang';
import type { Condition } from '../../../types/conditions';
import { esqlAstExpressionToCondition } from './esql_ast_to_condition';

function isName(command: ESQLCommand, name: string) {
  return command.name?.toLowerCase() === name.toLowerCase();
}

function asColumn(arg: ESQLAstItem): ESQLColumn | undefined {
  return (arg as any)?.type === 'column' ? (arg as ESQLColumn) : undefined;
}

function asStringLiteral(arg: ESQLAstItem): string | undefined {
  const lit = (arg as any)?.type === 'literal' ? (arg as ESQLLiteral) : undefined;
  if (!lit) return undefined;
  // Prefer the AST's unquoted value when available (ESQLStringLiteral)
  const unquoted = (lit as any).valueUnquoted ?? (lit as any).value;
  if (typeof unquoted === 'string') return unquoted;

  // Fallback: strip surrounding quotes and minimally unescape quotes/backslashes
  const raw = String((lit as any).text ?? '');
  const startsWithQuote = raw.startsWith('"') || raw.startsWith("'");
  const endsWithQuote = raw.endsWith('"') || raw.endsWith("'");
  if (startsWithQuote && endsWithQuote && raw.length >= 2) {
    const inner = raw.slice(1, -1);
    return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return raw;
}

function unwrapAst(arg: ESQLAstItem | ESQLAstItem[] | undefined): ESQLAstItem | undefined {
  if (Array.isArray(arg)) return arg[0];
  return arg;
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

  let activeCondition: Condition | undefined;
  const withWhere = <T extends StreamlangProcessorDefinition>(proc: T): T =>
    activeCondition ? ({ ...proc, where: activeCondition } as T) : proc;

  for (const cmd of (root as ESQLAstQueryExpression).commands) {
    const command = cmd as ESQLCommand;

    if (isName(command, 'where')) {
      const expr = (command as unknown as { args?: ESQLAstItem[] }).args?.[0] as
        | ESQLSingleAstItem
        | undefined;
      const cond = expr ? esqlAstExpressionToCondition(expr) : undefined;
      if (!cond) continue;
      activeCondition = activeCondition ? { and: [activeCondition, cond] } : cond;
      continue;
    }

    if (isName(command, 'grok')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        const grok: GrokProcessor = { action: 'grok', from: field.text, patterns: [pattern] };
        processors.push(withWhere(grok));
      }
      continue;
    }

    if (isName(command, 'dissect')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        const dissect: DissectProcessor = { action: 'dissect', from: field.text, pattern };
        processors.push(withWhere(dissect));
      }
      continue;
    }

    if (isName(command, 'eval')) {
      // EVAL a = b, c = "lit" → set/copy_from/date steps
      for (const arg of (command as unknown as { args?: ESQLAstItem[] }).args ?? []) {
        const assign = asBinaryFunc(arg, '=');
        if (!assign) continue;
        const [leftRaw, rightRaw] = (assign.args || []) as (ESQLAstItem | ESQLAstItem[])[];
        const left = unwrapAst(leftRaw) as ESQLAstItem | undefined;
        const right = unwrapAst(rightRaw) as ESQLAstItem | undefined;
        const target = left ? asColumn(left) : undefined;
        if (!target) continue;
        const rightCol = right ? asColumn(right) : undefined;
        if (rightCol) {
          const setCopy: SetProcessor = { action: 'set', to: target.text, copy_from: rightCol.text };
          processors.push(withWhere(setCopy));
          continue;
        }
        // Map EVAL target = DATE_PARSE(source, pattern)
        const dateFn = right ? asFunction(right, 'date_parse') : undefined;
        if (dateFn && Array.isArray((dateFn as unknown as { args?: ESQLAstItem[] }).args)) {
          const [srcArg, patternArg] = ((dateFn as unknown as { args?: ESQLAstItem[] }).args ?? []) as ESQLAstItem[];
          const srcCol = srcArg ? asColumn(srcArg) : undefined;
          const pattern = patternArg && (patternArg as unknown as { type?: string }).type === 'literal' ? asStringLiteral(patternArg as ESQLAstItem) : undefined;
          if (srcCol && pattern) {
            const dateProc: DateProcessor = {
              action: 'date',
              from: srcCol.text,
              to: target.text,
              formats: [pattern],
            };
            processors.push(withWhere(dateProc));
            continue;
          }
        }
        
        if (right && isLiteral(right)) {
          const value = (right as unknown as { value?: unknown }).value ?? asStringLiteral(right);
          const setVal: SetProcessor = { action: 'set', to: target.text, value };
          processors.push(withWhere(setVal));
        }
      }
      continue;
    }

    if (isName(command, 'rename')) {
      // RENAME old AS new → rename
      for (const arg of (command as unknown as { args?: ESQLAstItem[] }).args ?? []) {
        const asCall = asBinaryFunc(arg, 'as');
        if (!asCall) continue;
        const [oldRef, newRef] = (asCall.args || []) as ESQLAstItem[];
        const oldCol = asColumn(oldRef);
        const newName = asStringLiteral(newRef) || (asColumn(newRef)?.text);
        if (oldCol && newName) {
          const rename: RenameProcessor = { action: 'rename', from: oldCol.text, to: newName };
          processors.push(withWhere(rename));
        }
      }
      continue;
    }
  }

  return processors;
}

function isLiteral(item: ESQLAstItem): item is ESQLLiteral {
  return (item as any)?.type === 'literal';
}

function asBinaryFunc(item: ESQLAstItem, name: string): ESQLFunction | undefined {
  const isFunction = (item as any)?.type === 'function';
  if (!isFunction) return undefined;
  const f = item as ESQLFunction;
  return String((f as any).name || '').toLowerCase() === name.toLowerCase() ? f : undefined;
}

function asFunction(item: ESQLAstItem, name?: string): ESQLFunction | undefined {
  const isFunction = (item as any)?.type === 'function';
  if (!isFunction) return undefined;
  const f = item as ESQLFunction;
  if (!name) return f;
  return String((f as any).name || '').toLowerCase() === name.toLowerCase() ? f : undefined;
}

/**
 * Build Streamlang steps (preferable for URL schema v3) preserving WHERE gating semantics.
 */
export function esqlToStreamlangSteps(
  query: string,
  _opts: ReverseTranslationOptions = {}
): StreamlangStep[] {
  const { root } = Parser.parse(query);
  const steps: StreamlangStep[] = [];

  let activeCondition: Condition | undefined;
  const withWhere = <T extends StreamlangProcessorDefinition>(proc: T): T =>
    activeCondition ? ({ ...proc, where: activeCondition } as T) : proc;

  for (const cmd of (root as ESQLAstQueryExpression).commands) {
    const command = cmd as ESQLCommand;

    if (isName(command, 'where')) {
      const expr = (command as unknown as { args?: ESQLAstItem[] }).args?.[0] as
        | ESQLSingleAstItem
        | undefined;
      const cond = expr ? esqlAstExpressionToCondition(expr) : undefined;
      if (!cond) continue;
      // WHERE compounds for subsequent processors
      activeCondition = activeCondition ? { and: [activeCondition, cond] } : cond;
      continue;
    }

    if (isName(command, 'grok')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        const grok: GrokProcessor = { action: 'grok', from: field.text, patterns: [pattern] };
        steps.push(withWhere(grok));
      }
      continue;
    }

    if (isName(command, 'dissect')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        const dissect: DissectProcessor = { action: 'dissect', from: field.text, pattern };
        steps.push(withWhere(dissect));
      }
      continue;
    }

    if (isName(command, 'eval')) {
      for (const arg of (command as unknown as { args?: ESQLAstItem[] }).args ?? []) {
        const assign = asBinaryFunc(arg, '=');
        if (!assign) continue;
        const [leftRaw, rightRaw] = (assign.args || []) as (ESQLAstItem | ESQLAstItem[])[];
        const left = unwrapAst(leftRaw) as ESQLAstItem | undefined;
        const right = unwrapAst(rightRaw) as ESQLAstItem | undefined;
        const target = left ? asColumn(left) : undefined;
        if (!target) continue;
        const rightCol = right ? asColumn(right) : undefined;
        if (rightCol) {
          const setCopy: SetProcessor = { action: 'set', to: target.text, copy_from: rightCol.text };
          steps.push(withWhere(setCopy));
          continue;
        }
        // Map EVAL target = DATE_PARSE(source, pattern)
        const dateFn = right ? asFunction(right, 'date_parse') : undefined;
        if (dateFn && Array.isArray((dateFn as unknown as { args?: ESQLAstItem[] }).args)) {
          const [srcArg, patternArg] = ((dateFn as unknown as { args?: ESQLAstItem[] }).args ?? []) as ESQLAstItem[];
          const srcCol = srcArg ? asColumn(srcArg) : undefined;
          const pattern = patternArg && (patternArg as unknown as { type?: string }).type === 'literal' ? asStringLiteral(patternArg as ESQLAstItem) : undefined;
          if (srcCol && pattern) {
            const dateProc: DateProcessor = {
              action: 'date',
              from: srcCol.text,
              to: target.text,
              formats: [pattern],
            };
            steps.push(withWhere(dateProc));
            continue;
          }
        }
        
        if (right && isLiteral(right)) {
          const value = (right as unknown as { value?: unknown }).value ?? asStringLiteral(right);
          const setVal: SetProcessor = { action: 'set', to: target.text, value };
          steps.push(withWhere(setVal));
        }
      }
      continue;
    }

    if (isName(command, 'rename')) {
      for (const arg of (command as unknown as { args?: ESQLAstItem[] }).args ?? []) {
        const asCall = asBinaryFunc(arg, 'as');
        if (!asCall) continue;
        const [oldRef, newRef] = (asCall.args || []) as ESQLAstItem[];
        const oldCol = asColumn(oldRef);
        const newName = asStringLiteral(newRef) || (asColumn(newRef)?.text);
        if (oldCol && newName) {
          const rename: RenameProcessor = { action: 'rename', from: oldCol.text, to: newName };
          steps.push(withWhere(rename));
        }
      }
      continue;
    }
  }
  return steps;
}


