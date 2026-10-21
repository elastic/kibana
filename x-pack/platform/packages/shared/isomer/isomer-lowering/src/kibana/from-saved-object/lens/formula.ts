/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Small, dependency-free lowering pipeline for Lens "formula" metric
// columns. Lens stores a formula like `count(kql='X') / count()` as a single
// `formula` column whose visible expression lives in `params.formula`. The
// editor *also* materialises hidden support columns (`math`, filtered
// `count`s, time-shifted counts) so the in-product runtime can stream
// partial results, but for ES|QL synthesis we ignore those entirely and
// re-derive everything from the formula string. This module:
//
//   1. Parses the formula expression into an AST (`parseFormula`).
//   2. Lowers each aggregation call into a STATS aggregation with optional
//      per-aggregate `WHERE` clauses for filtered counts and time shifts.
//   3. Emits a single `EVAL <columnId> = <math>` line that references the
//      aggregations by stable alias so the binder can look them up.
//
// Anything we cannot represent (function we don't know, KQL we cannot
// translate, time-shift without a configured window) becomes a single
// diagnostic plus an `undefined` return so callers can degrade the panel
// cleanly.
//
// References on the formula grammar:
//   `x-pack/plugins/lens/public/datasources/form_based/operations/definitions/formula`
//   in elastic/kibana. We deliberately implement only the subset that
//   shows up on real dashboards (counts, sums/avgs, arithmetic, KQL
//   filters, `shift`); everything else falls through to a diagnostic.

import type { DiagnosticBag } from './diagnostics';
import { escapeEsqlIdentifier, esqlAggregate, esqlStringLiteral } from './esql';

// ----------------------------------------------------------------------
// AST
// ----------------------------------------------------------------------

interface NumberLiteral {
  kind: 'number';
  value: number;
}

interface AggCall {
  kind: 'agg';
  /** Lens function name (`count`, `sum`, `unique_count`, etc.). */
  fn: string;
  /** First positional arg (the field for `sum/avg/...`). `count()` has none. */
  field?: string;
  /** `kql='…'` named arg, if present. */
  kqlFilter?: string;
  /** `lucene='…'` named arg, if present. */
  luceneFilter?: string;
  /** `shift='1w'` named arg, if present. */
  shift?: string;
}

interface BinaryExpr {
  kind: 'binary';
  op: '+' | '-' | '*' | '/';
  left: FormulaExpr;
  right: FormulaExpr;
}

interface UnaryExpr {
  kind: 'unary';
  op: '-';
  operand: FormulaExpr;
}

export type FormulaExpr = NumberLiteral | AggCall | BinaryExpr | UnaryExpr;

// ----------------------------------------------------------------------
// Tokenizer
// ----------------------------------------------------------------------

type Token =
  | { type: 'number'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'string'; value: string }
  | { type: 'punct'; value: '(' | ')' | ',' | '=' }
  | { type: 'op'; value: '+' | '-' | '*' | '/' };

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '(' || c === ')' || c === ',' || c === '=') {
      tokens.push({ type: 'punct', value: c });
      i += 1;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/') {
      tokens.push({ type: 'op', value: c });
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      let buf = '';
      while (j < input.length && input[j] !== quote) {
        if (input[j] === '\\' && j + 1 < input.length) {
          buf += input[j + 1];
          j += 2;
          continue;
        }
        buf += input[j];
        j += 1;
      }
      if (input[j] !== quote) {
        throw new Error(`unterminated string literal in formula at ${i}`);
      }
      tokens.push({ type: 'string', value: buf });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const match = /^[0-9]+(?:\.[0-9]+)?/.exec(input.slice(i));
      if (!match) {
        throw new Error(`invalid number in formula at ${i}`);
      }
      tokens.push({ type: 'number', value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      const match = /^[a-zA-Z_][a-zA-Z0-9_.@-]*/.exec(input.slice(i));
      if (!match) {
        throw new Error(`invalid identifier in formula at ${i}`);
      }
      tokens.push({ type: 'ident', value: match[0] });
      i += match[0].length;
      continue;
    }
    throw new Error(`unexpected character "${c}" in formula at ${i}`);
  }
  return tokens;
};

// ----------------------------------------------------------------------
// Parser (recursive-descent, standard precedence)
// ----------------------------------------------------------------------

class Parser {
  constructor(private readonly tokens: Token[], private pos = 0) {}

  parse(): FormulaExpr {
    const expr = this.parseAdditive();
    if (this.pos < this.tokens.length) {
      throw new Error(
        `unexpected token "${JSON.stringify(this.tokens[this.pos])}" after expression`
      );
    }
    return expr;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const token = this.tokens[this.pos];
    if (!token) {
      throw new Error('unexpected end of formula');
    }
    this.pos += 1;
    return token;
  }

  private match(type: Token['type'], value?: string): boolean {
    const next = this.peek();
    if (!next || next.type !== type) {
      return false;
    }
    if (value !== undefined && next.value !== value) {
      return false;
    }
    this.pos += 1;
    return true;
  }

  private parseAdditive(): FormulaExpr {
    let left = this.parseMultiplicative();
    while (true) {
      const next = this.peek();
      if (next?.type === 'op' && (next.value === '+' || next.value === '-')) {
        this.consume();
        const right = this.parseMultiplicative();
        left = { kind: 'binary', op: next.value, left, right };
        continue;
      }
      break;
    }
    return left;
  }

  private parseMultiplicative(): FormulaExpr {
    let left = this.parseUnary();
    while (true) {
      const next = this.peek();
      if (next?.type === 'op' && (next.value === '*' || next.value === '/')) {
        this.consume();
        const right = this.parseUnary();
        left = { kind: 'binary', op: next.value, left, right };
        continue;
      }
      break;
    }
    return left;
  }

  private parseUnary(): FormulaExpr {
    const next = this.peek();
    if (next?.type === 'op' && next.value === '-') {
      this.consume();
      return { kind: 'unary', op: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaExpr {
    const next = this.peek();
    if (!next) {
      throw new Error('unexpected end of formula');
    }
    if (next.type === 'number') {
      this.consume();
      return { kind: 'number', value: next.value };
    }
    if (next.type === 'punct' && next.value === '(') {
      this.consume();
      const inner = this.parseAdditive();
      if (!this.match('punct', ')')) {
        throw new Error('expected ")" in formula');
      }
      return inner;
    }
    if (next.type === 'ident') {
      this.consume();
      if (!this.match('punct', '(')) {
        throw new Error(`expected "(" after identifier "${next.value}" in formula`);
      }
      const call: AggCall = { kind: 'agg', fn: next.value };
      if (this.match('punct', ')')) {
        return call;
      }
      // The first arg is positional iff it's a bare identifier not
      // followed by `=` (which would make it a named arg like
      // `kql='FlightDelay : true'`). We peek two tokens ahead to
      // disambiguate without committing to a particular shape.
      const firstTok = this.peek();
      const afterFirst = this.tokens[this.pos + 1];
      const isPositionalField =
        firstTok?.type === 'ident' &&
        !(afterFirst?.type === 'punct' && (afterFirst as { value: string }).value === '=');
      if (isPositionalField) {
        this.consume();
        call.field = (firstTok as { value: string }).value;
        if (this.match('punct', ',')) {
          this.parseNamedArgs(call);
        }
      } else {
        this.parseNamedArgs(call);
      }
      if (!this.match('punct', ')')) {
        throw new Error(`expected ")" closing call to ${next.value}`);
      }
      return call;
    }
    throw new Error(`unexpected token "${JSON.stringify(next)}" in formula primary`);
  }

  private parseNamedArgs(call: AggCall): void {
    while (true) {
      const name = this.peek();
      if (!name || name.type !== 'ident') {
        return;
      }
      const eqTok = this.tokens[this.pos + 1];
      if (!eqTok || eqTok.type !== 'punct' || eqTok.value !== '=') {
        return;
      }
      this.consume();
      this.consume();
      const value = this.consume();
      if (value.type !== 'string' && value.type !== 'ident') {
        throw new Error(`expected string or identifier for arg "${name.value}" in formula`);
      }
      const str = value.type === 'string' ? value.value : value.value;
      if (name.value === 'kql') {
        call.kqlFilter = str;
      } else if (name.value === 'lucene') {
        call.luceneFilter = str;
      } else if (name.value === 'shift') {
        call.shift = str;
      }
      // Unknown named args are silently ignored; this matches Lens runtime
      // behaviour and keeps us forward-compatible with new args we don't
      // implement yet.
      if (!this.match('punct', ',')) {
        return;
      }
    }
  }
}

export const parseFormula = (raw: string): FormulaExpr => {
  return new Parser(tokenize(raw)).parse();
};

// ----------------------------------------------------------------------
// KQL → ES|QL WHERE translator (small subset)
// ----------------------------------------------------------------------

// Lens formulas frequently embed KQL filters such as `FlightDelay : true`,
// `level : "warning"`, or a wildcard `*`. ES|QL doesn't speak KQL, so we
// translate a small, predictable subset into the equivalent boolean
// expression. Anything that doesn't fit (range queries, scripted clauses,
// nested boolean nesting) returns `undefined` and the caller degrades.

type KqlNode =
  | { kind: 'and'; children: KqlNode[] }
  | { kind: 'or'; children: KqlNode[] }
  | { kind: 'not'; child: KqlNode }
  | { kind: 'term'; field: string; value: string | number | boolean }
  | { kind: 'true' };

const parseKqlInner = (input: string): { node: KqlNode | undefined; reason?: string } => {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '*') {
    return { node: { kind: 'true' } };
  }
  // We deliberately keep this naive: a single `field : value` term, with
  // optional double-quoted string value. AND/OR/NOT are accepted at the
  // top level but only between simple terms.
  const tokens: string[] = [];
  let i = 0;
  while (i < trimmed.length) {
    const c = trimmed[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let buf = '"';
      while (j < trimmed.length && trimmed[j] !== '"') {
        buf += trimmed[j];
        j += 1;
      }
      if (trimmed[j] !== '"') {
        return { node: undefined, reason: 'unterminated string in KQL' };
      }
      buf += '"';
      tokens.push(buf);
      i = j + 1;
      continue;
    }
    if (c === '(' || c === ')' || c === ':') {
      tokens.push(c);
      i += 1;
      continue;
    }
    let j = i;
    while (
      j < trimmed.length &&
      !/\s/.test(trimmed[j]!) &&
      trimmed[j] !== '(' &&
      trimmed[j] !== ')' &&
      trimmed[j] !== ':' &&
      trimmed[j] !== '"'
    ) {
      j += 1;
    }
    tokens.push(trimmed.slice(i, j));
    i = j;
  }

  let pos = 0;
  const parseValue = (raw: string): string | number | boolean => {
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return raw.slice(1, -1);
    }
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(raw)) {
      return Number(raw);
    }
    return raw;
  };

  const parseTerm = (): KqlNode | undefined => {
    const tok = tokens[pos];
    if (!tok) {
      return undefined;
    }
    if (tok === '(') {
      pos += 1;
      const inner = parseOr();
      if (tokens[pos] !== ')') {
        return undefined;
      }
      pos += 1;
      return inner;
    }
    if (tok.toLowerCase() === 'not') {
      pos += 1;
      const child = parseTerm();
      if (!child) {
        return undefined;
      }
      return { kind: 'not', child };
    }
    // Expect `field : value`.
    pos += 1;
    if (tokens[pos] !== ':') {
      return undefined;
    }
    pos += 1;
    const valueTok = tokens[pos];
    if (!valueTok) {
      return undefined;
    }
    pos += 1;
    return { kind: 'term', field: tok, value: parseValue(valueTok) };
  };

  const parseAnd = (): KqlNode | undefined => {
    let left = parseTerm();
    if (!left) {
      return undefined;
    }
    while (tokens[pos]?.toLowerCase() === 'and') {
      pos += 1;
      const right = parseTerm();
      if (!right) {
        return undefined;
      }
      if (left.kind === 'and') {
        left.children.push(right);
      } else {
        left = { kind: 'and', children: [left, right] };
      }
    }
    return left;
  };

  const parseOr = (): KqlNode | undefined => {
    let left = parseAnd();
    if (!left) {
      return undefined;
    }
    while (tokens[pos]?.toLowerCase() === 'or') {
      pos += 1;
      const right = parseAnd();
      if (!right) {
        return undefined;
      }
      if (left.kind === 'or') {
        left.children.push(right);
      } else {
        left = { kind: 'or', children: [left, right] };
      }
    }
    return left;
  };

  const node = parseOr();
  if (!node || pos !== tokens.length) {
    return { node: undefined, reason: 'unrecognized KQL shape' };
  }
  return { node };
};

const literalForEsql = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return esqlStringLiteral(value);
};

const renderKql = (node: KqlNode): string => {
  switch (node.kind) {
    case 'true':
      return 'true';
    case 'term':
      return `${escapeEsqlIdentifier(node.field)} == ${literalForEsql(node.value)}`;
    case 'not':
      return `NOT (${renderKql(node.child)})`;
    case 'and':
      return node.children.map((c) => `(${renderKql(c)})`).join(' AND ');
    case 'or':
      return node.children.map((c) => `(${renderKql(c)})`).join(' OR ');
  }
};

export const kqlToEsqlWhere = (kql: string): { where?: string; reason?: string } => {
  const parsed = parseKqlInner(kql);
  if (!parsed.node) {
    return parsed.reason ? { reason: parsed.reason } : {};
  }
  if (parsed.node.kind === 'true') {
    // `kql='*'` means "match everything" — no WHERE clause needed.
    return {};
  }
  return { where: renderKql(parsed.node) };
};

// ----------------------------------------------------------------------
// Aggregation lowering
// ----------------------------------------------------------------------

const AGG_FN_TO_ESQL: Record<string, string> = {
  count: 'COUNT',
  sum: 'SUM',
  average: 'AVG',
  avg: 'AVG',
  min: 'MIN',
  max: 'MAX',
  median: 'MEDIAN',
  cardinality: 'COUNT_DISTINCT',
  unique_count: 'COUNT_DISTINCT',
};

export interface StatsAggregation {
  /** Stable per-formula alias, e.g. `__f0__`. */
  alias: string;
  /** ES|QL right-hand side, e.g. `COUNT(*) WHERE FlightDelay == true`. */
  expression: string;
  /**
   * Set when the aggregation was produced from a time-shifted call. The
   * synthesizer routes shifted aggregations into their own query so the
   * binder can compute the delta against the "current" query.
   */
  shift?: string;
}

export interface LoweredFormula {
  /** Aggregations the synthesizer should emit inside `STATS`. */
  aggregations: StatsAggregation[];
  /** Right-hand side of the `EVAL` that produces the formula's final value. */
  evalExpression: string;
  /**
   * Aggregations that need to be evaluated in a *time-shifted* window.
   * Empty when the formula has no `shift='…'` calls. The caller materialises
   * these as a separate query so the binder can join the results.
   */
  shiftedAggregations: StatsAggregation[];
}

interface LowerContext {
  diagnostics: DiagnosticBag;
  formulaColumnLabel: string;
  /** Stable counter so aliases are unique within a single formula. */
  counter: { n: number };
  bag: StatsAggregation[];
  shiftedBag: StatsAggregation[];
  failureReason?: string;
  /**
   * Duration of the active time range in milliseconds, used to fold Lens'
   * `time_range()` context function into a numeric literal. `undefined`
   * when no time range was supplied.
   */
  timeRangeMs?: number;
}

const newAlias = (ctx: LowerContext): string => {
  const next = `__f${ctx.counter.n}__`;
  ctx.counter.n += 1;
  return next;
};

const lowerAggCall = (call: AggCall, ctx: LowerContext): string | undefined => {
  if (call.luceneFilter !== undefined) {
    // We accept Lucene filters that happen to be syntactically identical
    // to KQL (`field:value`); anything else degrades.
    const result = kqlToEsqlWhere(call.luceneFilter);
    if (!result.where && !ctx.failureReason && call.luceneFilter.trim() !== '') {
      ctx.failureReason =
        result.reason ?? `formula "${ctx.formulaColumnLabel}" uses an unsupported Lucene filter`;
      return undefined;
    }
  }

  const fn = AGG_FN_TO_ESQL[call.fn];
  if (!fn) {
    ctx.failureReason = `formula "${ctx.formulaColumnLabel}" uses unsupported function "${call.fn}"`;
    return undefined;
  }
  const inner = esqlAggregate(fn, call.fn === 'count' ? undefined : call.field);
  if (!inner) {
    if (!call.field) {
      ctx.failureReason = `formula "${ctx.formulaColumnLabel}" calls "${call.fn}()" without a field argument`;
    } else {
      ctx.failureReason = `formula "${ctx.formulaColumnLabel}" uses unsupported function "${call.fn}"`;
    }
    return undefined;
  }

  let whereClause: string | undefined;
  const filterSource = call.kqlFilter ?? call.luceneFilter;
  if (filterSource !== undefined) {
    const result = kqlToEsqlWhere(filterSource);
    if (result.reason) {
      ctx.failureReason =
        result.reason ?? `formula "${ctx.formulaColumnLabel}" uses an unsupported KQL filter`;
      return undefined;
    }
    whereClause = result.where;
  }

  const alias = newAlias(ctx);
  const expression = whereClause ? `${inner} WHERE ${whereClause}` : inner;
  const aggregation: StatsAggregation = call.shift
    ? { alias, expression, shift: call.shift }
    : { alias, expression };
  if (call.shift) {
    ctx.shiftedBag.push(aggregation);
  } else {
    ctx.bag.push(aggregation);
  }
  return alias;
};

// Lens "context" functions resolve to a constant at render time rather than
// an aggregation. We fold the supported ones into numeric literals so a
// formula like `count() / (time_range() / 86400000)` (transactions per day)
// lowers cleanly. Returns `{ handled: false }` for ordinary aggregation
// calls so the caller falls through to {@link lowerAggCall}.
const lowerContextFunction = (
  call: AggCall,
  ctx: LowerContext
): { handled: true; value: string | undefined } | { handled: false } => {
  if (call.fn !== 'time_range') {
    return { handled: false };
  }
  if (ctx.timeRangeMs === undefined) {
    ctx.failureReason = `formula "${ctx.formulaColumnLabel}" uses time_range() but no time range was available to resolve its duration`;
    return { handled: true, value: undefined };
  }
  // Emit a floating-point literal so the surrounding integer divisions in
  // the formula (e.g. `/ 1000 / 60 / 60 / 24`) stay double-precision.
  const ms = ctx.timeRangeMs;
  return {
    handled: true,
    value: Number.isInteger(ms) ? `${ms}.0` : String(ms),
  };
};

const renderExpr = (expr: FormulaExpr, ctx: LowerContext): string | undefined => {
  switch (expr.kind) {
    case 'number':
      return String(expr.value);
    case 'agg': {
      const context = lowerContextFunction(expr, ctx);
      if (context.handled) {
        return context.value;
      }
      const alias = lowerAggCall(expr, ctx);
      if (!alias) {
        return undefined;
      }
      // Aggregations like COUNT/SUM/COUNT_DISTINCT return LONG in ES|QL,
      // which makes division truncate (e.g. `3270 / 13014` = `0`). Casting
      // to DOUBLE preserves the fractional result for ratio-style formulas
      // while staying a no-op for AVG/MEDIAN which are already DOUBLE.
      return `TO_DOUBLE(${alias})`;
    }
    case 'unary': {
      const inner = renderExpr(expr.operand, ctx);
      return inner === undefined ? undefined : `(${expr.op}${inner})`;
    }
    case 'binary': {
      const left = renderExpr(expr.left, ctx);
      const right = renderExpr(expr.right, ctx);
      if (left === undefined || right === undefined) {
        return undefined;
      }
      return `(${left} ${expr.op} ${right})`;
    }
  }
};

export interface LowerFormulaInput {
  formula: string;
  formulaColumnLabel: string;
  diagnostics: DiagnosticBag;
  /**
   * Shared counter for aggregation aliases. Callers that lower multiple
   * formula columns from the same Lens layer should pass the same object
   * so the emitted `STATS` aliases don't collide (e.g. two formulas would
   * both use `__f0__` / `__f1__` and the second `STATS` entry would
   * silently overwrite the first).
   */
  aliasCounter?: { n: number };
  /**
   * Duration of the active time range in milliseconds. Required to lower
   * Lens' `time_range()` context function; formulas that use it degrade
   * with a diagnostic when this is omitted.
   */
  timeRangeMs?: number;
}

export const lowerFormulaToStatsEval = (input: LowerFormulaInput): LoweredFormula | undefined => {
  const { formula, formulaColumnLabel, diagnostics, aliasCounter, timeRangeMs } = input;
  let ast: FormulaExpr;
  try {
    ast = parseFormula(formula);
  } catch (error) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.formula-parse-failed',
      message: `formula "${formulaColumnLabel}" could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return undefined;
  }

  const ctx: LowerContext = {
    diagnostics,
    formulaColumnLabel,
    counter: aliasCounter ?? { n: 0 },
    bag: [],
    shiftedBag: [],
    ...(timeRangeMs !== undefined ? { timeRangeMs } : {}),
  };
  const evalExpression = renderExpr(ast, ctx);
  if (evalExpression === undefined) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.formula-unlowered',
      message:
        ctx.failureReason ??
        `formula "${formulaColumnLabel}" contains an expression we can't translate yet`,
    });
    return undefined;
  }
  if (ctx.bag.length === 0 && ctx.shiftedBag.length === 0) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.formula-no-aggs',
      message: `formula "${formulaColumnLabel}" contains no aggregations; cannot be lowered`,
    });
    return undefined;
  }
  return {
    aggregations: ctx.bag,
    shiftedAggregations: ctx.shiftedBag,
    evalExpression,
  };
};
