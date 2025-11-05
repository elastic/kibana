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
import { literalToJs } from './literals';

type WhereWithSteps = Condition & { steps: StreamlangProcessorDefinition[] };

function isName(command: ESQLCommand, name: string) {
  return command.name?.toLowerCase() === name.toLowerCase();
}

function asColumn(arg: ESQLAstItem): ESQLColumn | undefined {
  if (Array.isArray(arg)) return undefined;
  return arg.type === 'column' ? arg : undefined;
}

function colName(col: ESQLColumn): string {
  return col.parts && col.parts.length ? col.parts.join('.') : col.text;
}

function asStringLiteral(arg: ESQLAstItem): string | undefined {
  if (Array.isArray(arg)) return undefined;
  const lit = arg.type === 'literal' ? arg : undefined;
  if (!lit) return undefined;

  const unquoted = (lit as any).valueUnquoted ?? (lit as any).value;
  if (typeof unquoted === 'string') return unquoted;

  const raw = String(lit.text ?? '');
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

export function esqlToStreamlangProcessors(
  query: string
): StreamlangProcessorDefinition[] {
  if (!query?.trim()) return [];
  const { root } = Parser.parse(/^[\s\t\n\r]*from\b/i.test(query) ? query : `FROM a | ${query}`);
  const processors: StreamlangProcessorDefinition[] = [];

  let activeCondition: Condition | undefined;
  const withWhere = <T extends StreamlangProcessorDefinition>(proc: T): T =>
    activeCondition ? ({ ...proc, where: activeCondition } as T) : proc;

  for (const cmd of (root as ESQLAstQueryExpression).commands) {
    const command = cmd as ESQLCommand;

    if (isName(command, 'where')) {
      const expr = command.args?.[0] as
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
        const grok: GrokProcessor = { action: 'grok', from: colName(field), patterns: [pattern] };
        processors.push(withWhere(grok));
      }
      continue;
    }

    if (isName(command, 'dissect')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        const dissect: DissectProcessor = { action: 'dissect', from: colName(field), pattern };
        processors.push(withWhere(dissect));
      }
      continue;
    }

    if (isName(command, 'eval')) {
      // EVAL a = b, c = "lit" → set/copy_from/date steps
      for (const arg of command.args ?? []) {
        const assign = asBinaryFunc(arg, '=');
        if (!assign) continue;
        const [leftRaw, rightRaw] = assign.args || [];
        const left = unwrapAst(leftRaw);
        const right = unwrapAst(rightRaw);
        const target = left ? asColumn(left) : undefined;
        if (!target) continue;
        const rightCol = right ? asColumn(right) : undefined;
        if (rightCol) {
          const setCopy: SetProcessor = { action: 'set', to: colName(target), copy_from: colName(rightCol) };
          processors.push(withWhere(setCopy));
          continue;
        }
        // Map EVAL target = DATE_PARSE(source, pattern)
        const dateFn = right ? asFunction(right, 'date_parse') : undefined;
        if (dateFn && dateFn.args) {
          const [srcArg, patternArg] = dateFn.args;
          const srcCol = srcArg ? asColumn(srcArg) : undefined;
          const pattern = patternArg && (patternArg as unknown as { type?: string }).type === 'literal' ? asStringLiteral(patternArg) : undefined;
          if (srcCol && pattern) {
            const dateProc: DateProcessor = {
              action: 'date',
              from: colName(srcCol),
              to: colName(target),
              formats: [pattern],
            };
            processors.push(withWhere(dateProc));
            continue;
          }
        }
        
        if (right && isLiteral(right)) {
          const value = literalToJs(right);
          const setVal: SetProcessor = { action: 'set', to: colName(target), value };
          processors.push(withWhere(setVal));
        }
      }
      continue;
    }

    if (isName(command, 'rename')) {
      for (const arg of command.args ?? []) {
        const asCall = asBinaryFunc(arg, 'as');
        if (!asCall) continue;
        const [oldRef, newRef] = asCall.args || [];
        const oldCol = asColumn(oldRef);
        const newName = asStringLiteral(newRef) || (asColumn(newRef) ? colName(asColumn(newRef)!) : undefined);
        if (oldCol && newName) {
          const rename: RenameProcessor = { action: 'rename', from: colName(oldCol), to: newName };
          processors.push(withWhere(rename));
        }
      }
      continue;
    }
  }

  return processors;
}

function isLiteral(item: ESQLAstItem): item is ESQLLiteral {
  if (Array.isArray(item)) return false;
  return item.type === 'literal';
}

function asBinaryFunc(item: ESQLAstItem, name: string): ESQLFunction | undefined {
  if (Array.isArray(item)) return undefined;
  const isFunction = item.type === 'function';
  if (!isFunction) return undefined;
  return String(item.name || '').toLowerCase() === name.toLowerCase() ? item : undefined;
}

function asFunction(item: ESQLAstItem, name?: string): ESQLFunction | undefined {
  if (Array.isArray(item)) return undefined;
  const isFunction = item.type === 'function';

  if (!isFunction) return undefined;
  const f = item as ESQLFunction;
  if (!name) return f;
  return String(f.name || '').toLowerCase() === name.toLowerCase() ? f : undefined;
}

/**
 * Build Streamlang steps (preferable for URL schema v3) preserving WHERE gating semantics.
 */
export function esqlToStreamlangSteps(
  query: string
): StreamlangStep[] {
  if (!query?.trim()) return [];
  const { root } = Parser.parse(/^[\s\t\n\r]*from\b/i.test(query) ? query : `FROM a | ${query}`);
  const steps: StreamlangStep[] = [];

  let activeCondition: Condition | undefined;
  // Track the current where block segment and how many children it has
  let currentWhere: WhereWithSteps | null = null;
  let currentWhereChildren = 0;

  const emitAction = (proc: StreamlangProcessorDefinition) => {
    if (activeCondition) {
      // Ensure a where segment exists for this action
      if (!currentWhere) {
        const newBlock = { where: { ...(activeCondition as Condition), steps: [] as StreamlangProcessorDefinition[] } as WhereWithSteps };
        steps.push(newBlock as StreamlangStep);
        currentWhere = newBlock.where;
        currentWhereChildren = 0;
      }
      currentWhere.steps.push(proc);
      currentWhereChildren += 1;
    } else {
      steps.push(proc);
    }
  };

  for (const cmd of root.commands) {
    const command = cmd;

    if (isName(command, 'where')) {
      const expr = command.args?.[0] as
        | ESQLSingleAstItem
        | undefined;
      const cond = expr ? esqlAstExpressionToCondition(expr) : undefined;
      if (!cond) continue;
      // WHERE compounds for subsequent processors
      activeCondition = activeCondition ? { and: [activeCondition, cond] } : cond;

      // If there is no current where block, or the current block already has children,
      // start a new segment. Otherwise (current block exists but is still empty), just
      // update its condition.
      if (!currentWhere || currentWhereChildren > 0) {
        const newBlock = { where: { ...(activeCondition as Condition), steps: [] as StreamlangProcessorDefinition[] } as WhereWithSteps };
        steps.push(newBlock as StreamlangStep);
        currentWhere = newBlock.where;
        currentWhereChildren = 0;
      } else {
        const updated: WhereWithSteps = { ...(activeCondition as Condition), steps: currentWhere.steps };
        (steps[steps.length - 1] as any).where = updated;
        currentWhere = updated; 
      }
      continue;
    }

    if (isName(command, 'grok')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        const grok: GrokProcessor = { action: 'grok', from: colName(field), patterns: [pattern] };
        emitAction(grok);
      }
      continue;
    }

    if (isName(command, 'dissect')) {
      const field = asColumn(command.args[0]);
      const pattern = asStringLiteral(command.args[1]);
      if (field && pattern) {
        const dissect: DissectProcessor = { action: 'dissect', from: colName(field), pattern };
        emitAction(dissect);
      }
      continue;
    }

    if (isName(command, 'eval')) {
      for (const arg of command.args ?? []) {
        const assign = asBinaryFunc(arg, '=');
        if (!assign) continue;
        const [leftRaw, rightRaw] = assign.args || [];
        const left = unwrapAst(leftRaw);
        const right = unwrapAst(rightRaw);
        const target = left ? asColumn(left) : undefined;
        if (!target) continue;
        const rightCol = right ? asColumn(right) : undefined;
        if (rightCol) {
          const setCopy: SetProcessor = { action: 'set', to: colName(target), copy_from: colName(rightCol) };
          emitAction(setCopy);
          continue;
        }
        // Map EVAL target = DATE_PARSE(source, pattern)
        const dateFn = right ? asFunction(right, 'date_parse') : undefined;
        if (dateFn && dateFn.args) {
          const [srcArg, patternArg] = dateFn.args;
          const srcCol = srcArg ? asColumn(srcArg) : undefined;
          const pattern = patternArg && (patternArg as unknown as { type?: string }).type === 'literal' ? asStringLiteral(patternArg) : undefined;
          if (srcCol && pattern) {
            const dateProc: DateProcessor = {
              action: 'date',
              from: colName(srcCol),
              to: colName(target),
              formats: [pattern],
            };
            emitAction(dateProc);
            continue;
          }
        }
        
        if (right && isLiteral(right)) {
          const value = literalToJs(right);
          const setVal: SetProcessor = { action: 'set', to: colName(target), value };
          emitAction(setVal);
        }
      }
      continue;
    }

    if (isName(command, 'rename')) {
      for (const arg of command.args ?? []) {
        const asCall = asBinaryFunc(arg, 'as');
        if (!asCall) continue;
        const [oldRef, newRef] = asCall.args || [];
        const oldCol = asColumn(oldRef);
        const newName = asStringLiteral(newRef) || (asColumn(newRef) ? colName(asColumn(newRef)!) : undefined);
        if (oldCol && newName) {
          const rename: RenameProcessor = { action: 'rename', from: colName(oldCol), to: newName };
          emitAction(rename);
        }
      }
      continue;
    }
  }
  // If only WHERE clauses were present, ensure a where block exists
  if (steps.length === 0 && activeCondition) {
    steps.push({ where: { ...activeCondition, steps: [] } });
  }
  return steps;
}


