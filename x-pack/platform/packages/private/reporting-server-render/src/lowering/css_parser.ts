/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A small, forgiving CSS parser: just enough structure (rules, at-rules, declarations) for
 * `takumi_css.ts` to prune and rewrite a page's stylesheets. Deliberately not `postcss`/
 * `css-tree`: those are dev-only dependencies of the repo and would not ship in a
 * distribution; and the input here is machine-generated (Emotion, EUI, build output), never
 * hand-written, so full error recovery isn't needed -- anything this can't make sense of is
 * skipped rather than thrown on.
 */

export interface CssDeclaration {
  prop: string;
  value: string;
  important: boolean;
}

export interface CssRule {
  type: 'rule';
  selector: string;
  declarations: CssDeclaration[];
}

export interface CssAtRule {
  type: 'atrule';
  name: string;
  params: string;
  /** Present for conditional/grouping at-rules (`@media`, `@layer`, `@supports`, ...) and `@keyframes`. */
  rules?: CssNode[];
  /** Present for declaration-bodied at-rules (`@font-face`, `@page`). */
  declarations?: CssDeclaration[];
}

export type CssNode = CssRule | CssAtRule;

/** At-rules whose block holds nested rules rather than declarations. */
const NESTED_RULE_AT_RULES = new Set([
  'media',
  'supports',
  'layer',
  'container',
  'scope',
  'document',
  'keyframes',
  '-webkit-keyframes',
  '-moz-keyframes',
]);

class Scanner {
  private pos = 0;
  constructor(private readonly src: string) {}

  public get done() {
    return this.pos >= this.src.length;
  }

  peek(): string {
    return this.src[this.pos];
  }

  next(): string {
    return this.src[this.pos++];
  }

  skipTrivia() {
    while (!this.done) {
      const ch = this.src[this.pos];
      if (ch === '/' && this.src[this.pos + 1] === '*') {
        const end = this.src.indexOf('*/', this.pos + 2);
        this.pos = end === -1 ? this.src.length : end + 2;
      } else if (/\s/.test(ch)) {
        this.pos++;
      } else {
        break;
      }
    }
  }

  /**
   * Reads up to (not including) the first of `stops` outside strings, comments, and
   * `()`/`[]` nesting. Leaves the terminator unconsumed; returns the text read.
   */
  readUntil(stops: string): string {
    const start = this.pos;
    let depth = 0;
    while (!this.done) {
      const ch = this.src[this.pos];
      if (ch === '"' || ch === "'") {
        this.skipString(ch);
        continue;
      }
      if (ch === '/' && this.src[this.pos + 1] === '*') {
        const end = this.src.indexOf('*/', this.pos + 2);
        this.pos = end === -1 ? this.src.length : end + 2;
        continue;
      }
      // A `}` ends the declaration/selector even inside an unbalanced `(`: without this, one
      // malformed value would swallow the rest of the stylesheet.
      if (ch === '}' && stops.includes('}')) break;
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      else if (depth === 0 && stops.includes(ch)) break;
      else if (ch === '\\') this.pos++;
      this.pos++;
    }
    return this.src.slice(start, this.pos);
  }

  /** Skips a balanced `{ ... }` block, assuming the opening `{` is already consumed. */
  skipBlock() {
    let depth = 1;
    while (!this.done && depth > 0) {
      const ch = this.src[this.pos];
      if (ch === '"' || ch === "'") {
        this.skipString(ch);
        continue;
      }
      if (ch === '/' && this.src[this.pos + 1] === '*') {
        const end = this.src.indexOf('*/', this.pos + 2);
        this.pos = end === -1 ? this.src.length : end + 2;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '\\') this.pos++;
      this.pos++;
    }
  }

  private skipString(quote: string) {
    this.pos++;
    while (!this.done) {
      const ch = this.src[this.pos];
      if (ch === '\\') this.pos++;
      else if (ch === quote) break;
      this.pos++;
    }
    this.pos++;
  }
}

const parseDeclarationText = (text: string): CssDeclaration | undefined => {
  const colon = text.indexOf(':');
  if (colon <= 0) return undefined;
  const prop = text.slice(0, colon).trim();
  let value = text.slice(colon + 1).trim();
  if (!prop || !value) return undefined;
  let important = false;
  const importantMatch = value.match(/\s*!\s*important\s*$/i);
  if (importantMatch) {
    important = true;
    value = value.slice(0, importantMatch.index).trim();
  }
  return {
    // Custom properties are case-sensitive; every other property name is not.
    prop: prop.startsWith('--') ? prop : prop.toLowerCase(),
    value,
    important,
  };
};

/** Parses a declaration block's body (the `{` already consumed); consumes the closing `}`. */
const parseDeclarations = (scanner: Scanner): CssDeclaration[] => {
  const declarations: CssDeclaration[] = [];
  while (!scanner.done) {
    scanner.skipTrivia();
    if (scanner.done) break;
    if (scanner.peek() === '}') {
      scanner.next();
      break;
    }
    if (scanner.peek() === ';') {
      scanner.next();
      continue;
    }
    const text = scanner.readUntil(';{}');
    const terminator = scanner.done ? '' : scanner.peek();
    if (terminator === '{') {
      // Nested rule (CSS nesting): not supported, skip its block rather than misparse it.
      scanner.next();
      scanner.skipBlock();
      continue;
    }
    const declaration = parseDeclarationText(text);
    if (declaration) declarations.push(declaration);
    if (terminator === ';') scanner.next();
  }
  return declarations;
};

const parseNodes = (scanner: Scanner, nested: boolean): CssNode[] => {
  const nodes: CssNode[] = [];
  while (!scanner.done) {
    scanner.skipTrivia();
    if (scanner.done) break;
    if (scanner.peek() === '}') {
      if (nested) {
        scanner.next();
        break;
      }
      scanner.next(); // stray closing brace at top level
      continue;
    }
    if (scanner.peek() === '@') {
      scanner.next();
      const prelude = scanner.readUntil(';{}').trim();
      const nameMatch = prelude.match(/^[-\w]+/);
      const name = (nameMatch ? nameMatch[0] : '').toLowerCase();
      const params = prelude.slice(name.length).trim();
      const terminator = scanner.done ? '' : scanner.peek();
      if (terminator === '{') {
        scanner.next();
        if (NESTED_RULE_AT_RULES.has(name)) {
          nodes.push({ type: 'atrule', name, params, rules: parseNodes(scanner, true) });
        } else {
          nodes.push({ type: 'atrule', name, params, declarations: parseDeclarations(scanner) });
        }
      } else {
        if (terminator === ';') scanner.next();
        nodes.push({ type: 'atrule', name, params });
      }
      continue;
    }
    const selector = scanner.readUntil('{;}').trim();
    const terminator = scanner.done ? '' : scanner.peek();
    if (terminator === '{') {
      scanner.next();
      nodes.push({ type: 'rule', selector, declarations: parseDeclarations(scanner) });
    } else if (terminator === ';') {
      scanner.next(); // junk statement
    }
  }
  return nodes;
};

export const parseCss = (css: string): CssNode[] => parseNodes(new Scanner(css), false);

/** Parses the text of a `style="..."` attribute into declarations. */
export const parseInlineStyle = (style: string): CssDeclaration[] =>
  parseDeclarations(new Scanner(style));

/** Splits a selector list on top-level commas (not inside `()`/`[]`/strings). */
export const splitSelectorList = (selector: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '\\') i++;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      parts.push(selector.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(selector.slice(start).trim());
  return parts.filter(Boolean);
};

export const serializeDeclarations = (declarations: CssDeclaration[]): string =>
  declarations.map((d) => `${d.prop}:${d.value}${d.important ? ' !important' : ''}`).join(';');
