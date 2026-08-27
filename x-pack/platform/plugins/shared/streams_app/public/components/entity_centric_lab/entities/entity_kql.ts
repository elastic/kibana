/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A tiny, self-contained KQL-ish evaluator so the ElasticOn Inventory
 * search bar can *genuinely* filter the seeded (in-memory) entities —
 * there's no Elasticsearch index behind them, so the real `buildEsQuery`
 * pipeline can't be used. It supports the "simple" subset the product
 * asked for:
 *
 *   field:value            exact, case-insensitive match on a known field
 *   field:"a value"        quoted values (may contain spaces)
 *   field:pay*             `*` wildcards
 *   free text              substring match across name / type / tags
 *   AND / OR / NOT         boolean operators (also lowercase), with the
 *                          usual NOT > AND > OR precedence
 *   ( … )                  grouping
 *   implicit AND           adjacent clauses are AND-ed ("a:1 b:2")
 *
 * Unknown fields (e.g. `os.type` — we don't model an OS) are deliberately
 * *ignored* (treated as always-true) so illustrative example queries never
 * blank the whole grid. Anything we can't parse falls back to "match all"
 * so a half-typed query never hides everything.
 */

import type { Filter } from '@kbn/es-query';
import type { Entity } from './fake_entities';

type EntityPredicate = (entity: Entity) => boolean;

const MATCH_ALL: EntityPredicate = () => true;

/** Canonical field name → the values to test for an entity. */
const FIELD_ALIASES: Record<string, string> = {
  'cloud.provider': 'provider',
  'service.environment': 'environment',
  'orchestrator.namespace': 'category',
};

const KNOWN_FIELDS = new Set([
  'name',
  'type',
  'subtype',
  'category',
  'provider',
  'health',
  'application',
  'environment',
  'team',
  'region',
]);

const fieldValues = (entity: Entity, rawField: string): string[] => {
  const field = FIELD_ALIASES[rawField] ?? rawField;
  switch (field) {
    case 'name':
      return [entity.name];
    case 'type':
      return [entity.type];
    case 'subtype':
      return entity.subType ? [entity.subType] : [];
    case 'category':
      return [entity.category];
    case 'provider':
      return entity.provider ? [entity.provider] : [];
    case 'health':
      return [entity.health];
    case 'application':
    case 'environment':
    case 'team':
    case 'region':
      return entity.tags[field] ? [entity.tags[field]] : [];
    default:
      return [];
  }
};

const isKnownField = (rawField: string): boolean =>
  KNOWN_FIELDS.has((FIELD_ALIASES[rawField] ?? rawField).toLowerCase());

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive value match with `*` wildcard support (full match). */
const valueMatches = (actual: string, expected: string): boolean => {
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  if (e.includes('*')) {
    const pattern = `^${e.split('*').map(escapeRegExp).join('.*')}$`;
    return new RegExp(pattern).test(a);
  }
  return a === e;
};

const freeTextHaystack = (entity: Entity): string =>
  [
    entity.name,
    entity.type,
    entity.subType ?? '',
    entity.category,
    entity.provider ?? '',
    entity.health,
    entity.tags.application,
    entity.tags.environment,
    entity.tags.team,
    entity.tags.region,
  ]
    .join(' ')
    .toLowerCase();

const clausePredicate = (raw: string): EntityPredicate => {
  const term = raw.trim();
  if (!term) return MATCH_ALL;
  // Split on the first colon that isn't inside quotes.
  const colon = term.indexOf(':');
  if (colon === -1) {
    const needle = stripQuotes(term).toLowerCase();
    if (!needle) return MATCH_ALL;
    return (entity) => freeTextHaystack(entity).includes(needle);
  }
  const field = term.slice(0, colon).trim().toLowerCase();
  const value = stripQuotes(term.slice(colon + 1).trim());
  // Unknown field → ignore (don't blank the grid on illustrative fields).
  if (!isKnownField(field)) return MATCH_ALL;
  return (entity) => {
    const values = fieldValues(entity, field);
    if (values.length === 0) return false;
    return values.some((candidate) => valueMatches(candidate, value));
  };
};

const stripQuotes = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
};

// ---------------------------------------------------------------------------
// Tokenizer + recursive-descent parser
// ---------------------------------------------------------------------------

/**
 * KQL allows whitespace around the field/value colon (`application : "x"`),
 * but our whitespace-delimited tokenizer would otherwise read `application`,
 * `:` and `"x"` as three separate clauses — turning the field match into a
 * free-text search that matches nothing. Collapse spaces immediately around
 * any *unquoted* colon so `field : value` becomes `field:value`. Colons inside
 * quotes are left untouched.
 */
const normalizeColons = (input: string): string => {
  let out = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      out += char;
      continue;
    }
    if (!inQuotes && char === ':') {
      // Drop the whitespace we just appended before the colon...
      out = out.replace(/[ \t\n]+$/, '');
      out += ':';
      // ...and skip any whitespace that follows it.
      let j = i + 1;
      while (j < input.length && /[ \t\n]/.test(input[j])) j += 1;
      i = j - 1;
      continue;
    }
    out += char;
  }
  return out;
};

type Token =
  | { readonly kind: 'and' }
  | { readonly kind: 'or' }
  | { readonly kind: 'not' }
  | { readonly kind: 'lparen' }
  | { readonly kind: 'rparen' }
  | { readonly kind: 'clause'; readonly text: string };

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const char = input[i];
    if (char === ' ' || char === '\t' || char === '\n') {
      i += 1;
      continue;
    }
    if (char === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }
    // Read a term, allowing embedded quoted segments (which may contain
    // spaces / parens): field:"a (b) c".
    let term = '';
    while (i < n) {
      const c = input[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '(' || c === ')') break;
      if (c === '"') {
        term += '"';
        i += 1;
        while (i < n && input[i] !== '"') {
          term += input[i];
          i += 1;
        }
        if (i < n) {
          term += '"';
          i += 1;
        }
        continue;
      }
      term += c;
      i += 1;
    }
    const upper = term.toUpperCase();
    if (upper === 'AND') tokens.push({ kind: 'and' });
    else if (upper === 'OR') tokens.push({ kind: 'or' });
    else if (upper === 'NOT') tokens.push({ kind: 'not' });
    else tokens.push({ kind: 'clause', text: term });
  }
  return tokens;
};

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): EntityPredicate {
    if (this.tokens.length === 0) return MATCH_ALL;
    const predicate = this.parseOr();
    // Trailing garbage → treat the whole thing as match-all rather than
    // partially filtering on an incomplete expression.
    if (this.pos !== this.tokens.length) return MATCH_ALL;
    return predicate;
  }

  private parseOr(): EntityPredicate {
    let left = this.parseAnd();
    while (this.peek()?.kind === 'or') {
      this.next();
      const right = this.parseAnd();
      const l = left;
      left = (entity) => l(entity) || right(entity);
    }
    return left;
  }

  private parseAnd(): EntityPredicate {
    let left = this.parseNot();
    for (;;) {
      const token = this.peek();
      if (!token) break;
      if (token.kind === 'and') {
        this.next();
      } else if (token.kind === 'not' || token.kind === 'lparen' || token.kind === 'clause') {
        // implicit AND between adjacent clauses
      } else {
        break;
      }
      const right = this.parseNot();
      const l = left;
      left = (entity) => l(entity) && right(entity);
    }
    return left;
  }

  private parseNot(): EntityPredicate {
    if (this.peek()?.kind === 'not') {
      this.next();
      const operand = this.parseNot();
      return (entity) => !operand(entity);
    }
    return this.parseAtom();
  }

  private parseAtom(): EntityPredicate {
    const token = this.next();
    if (!token) return MATCH_ALL;
    if (token.kind === 'lparen') {
      const inner = this.parseOr();
      if (this.peek()?.kind === 'rparen') this.next();
      return inner;
    }
    if (token.kind === 'clause') {
      return clausePredicate(token.text);
    }
    // Unexpected operator/paren in atom position → match all.
    return MATCH_ALL;
  }
}

/**
 * Compile a KQL-ish expression into a predicate over entities. Empty or
 * unparseable input compiles to "match all". The result is a plain
 * function so callers can reuse it across a `.filter()` pass.
 */
export const compileEntityKql = (query: string): EntityPredicate => {
  const trimmed = query.trim();
  if (!trimmed) return MATCH_ALL;
  try {
    return new Parser(tokenize(normalizeColons(trimmed))).parse();
  } catch {
    return MATCH_ALL;
  }
};

/**
 * Distinct values for a data-view field name across a set of entities,
 * optionally narrowed to those containing `query` (case-insensitive).
 * Powers the search bar's value autocomplete (e.g. typing `application:`
 * suggests the seeded app names) since there's no ES index to term-enum.
 * The `fieldName` is the data-view field (e.g. `cloud.provider`), which is
 * mapped to the entity property via the same aliases used for filtering.
 */
export const collectFieldValues = (
  entities: readonly Entity[],
  fieldName: string,
  query: string = '',
  max: number = 100
): string[] => {
  const field = fieldName.trim().toLowerCase();
  if (!isKnownField(field)) return [];
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  for (const entity of entities) {
    for (const value of fieldValues(entity, field)) {
      if (!value) continue;
      if (needle && !value.toLowerCase().includes(needle)) continue;
      seen.add(value);
    }
  }
  return Array.from(seen)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, max);
};

/**
 * Apply the phrase filters produced by the search bar's "+ Add filter"
 * chips. Only simple phrase filters (`meta.key` / `meta.params.query`) are
 * honored — anything more exotic is ignored so it can't blank the grid.
 * `meta.negate` and `meta.disabled` are respected.
 */
export const entityMatchesFilters = (filters: readonly Filter[], entity: Entity): boolean => {
  for (const filter of filters) {
    const meta = filter?.meta;
    if (!meta || meta.disabled) continue;
    const field = typeof meta.key === 'string' ? meta.key.toLowerCase() : undefined;
    if (!field || !isKnownField(field)) continue;
    const params = meta.params as { query?: unknown } | undefined;
    const rawValue = params && typeof params.query !== 'undefined' ? params.query : undefined;
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') continue;
    const values = fieldValues(entity, field);
    const matched =
      values.length > 0 && values.some((candidate) => valueMatches(candidate, String(rawValue)));
    if (meta.negate ? matched : !matched) return false;
  }
  return true;
};
