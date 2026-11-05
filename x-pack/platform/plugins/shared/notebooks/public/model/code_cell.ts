/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Token {
  kind: 'identifier' | 'punctuator' | 'literal';
  value: string;
  start: number;
  end: number;
}

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[\w$]/;
const DIGIT = /\d/;
const WHITESPACE = /\s/;
const MULTI_CHAR_PUNCTUATORS = ['...', '?.'];
const REGEX_AFTER_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
]);
const DECLARATION_KEYWORDS = new Set(['const', 'let', 'var', 'function', 'class']);
const RESERVED_WORDS = new Set([
  ...REGEX_AFTER_KEYWORDS,
  ...DECLARATION_KEYWORDS,
  'async',
  'break',
  'catch',
  'continue',
  'debugger',
  'default',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'if',
  'import',
  'null',
  'super',
  'switch',
  'this',
  'true',
  'try',
  'while',
  'with',
]);

/** Where a regex ends: after its closing `/`, skipping escapes and `[...]` classes, plus flags. */
const scanRegex = (code: string, start: number): number => {
  let index = start + 1;
  let inClass = false;
  while (index < code.length && code[index] !== '\n') {
    const char = code[index];
    if (char === '\\') index++;
    else if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (char === '/' && !inClass) break;
    index++;
  }
  index++;
  while (index < code.length && IDENTIFIER_PART.test(code[index])) index++;
  return index;
};

/** Where a template literal's text run ends, and whether it ended by opening a `${` expression. */
const scanTemplateText = (
  code: string,
  start: number
): { end: number; opensExpression: boolean } => {
  let index = start;
  while (index < code.length) {
    const char = code[index];
    if (char === '\\') index += 2;
    else if (char === '`') return { end: index + 1, opensExpression: false };
    else if (char === '$' && code[index + 1] === '{')
      return { end: index + 2, opensExpression: true };
    else index++;
  }
  return { end: index, opensExpression: false };
};

/**
 * Splits JavaScript into identifiers, punctuators and literals, skipping whitespace and comments.
 * Strings, regexes and the text of template literals are literals; template expressions are
 * tokenized as code. Good enough to find names without a full parser.
 */
const tokenize = (code: string): Token[] => {
  const tokens: Token[] = [];
  const templateBraceDepths: number[] = [];
  let braceDepth = 0;
  let index = 0;

  const push = (kind: Token['kind'], start: number, end: number) =>
    tokens.push({ kind, value: code.slice(start, end), start, end });
  const isRegexAllowed = (): boolean => {
    const previous = tokens[tokens.length - 1];
    if (!previous) return true;
    if (previous.kind === 'identifier') return REGEX_AFTER_KEYWORDS.has(previous.value);
    return previous.kind === 'punctuator' && previous.value !== ')' && previous.value !== ']';
  };
  const scanTemplate = (start: number) => {
    const { end, opensExpression } = scanTemplateText(code, start);
    push('literal', start, end);
    if (opensExpression) templateBraceDepths.push(braceDepth++);
    return end;
  };

  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];
    if (WHITESPACE.test(char)) {
      index++;
    } else if (char === '/' && next === '/') {
      const lineEnd = code.indexOf('\n', index);
      index = lineEnd === -1 ? code.length : lineEnd;
    } else if (char === '/' && next === '*') {
      const commentEnd = code.indexOf('*/', index + 2);
      index = commentEnd === -1 ? code.length : commentEnd + 2;
    } else if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < code.length && code[end] !== char && code[end] !== '\n') {
        end += code[end] === '\\' ? 2 : 1;
      }
      push('literal', index, end + 1);
      index = end + 1;
    } else if (char === '`') {
      index = scanTemplate(index + 1);
    } else if (
      char === '}' &&
      templateBraceDepths[templateBraceDepths.length - 1] === braceDepth - 1
    ) {
      templateBraceDepths.pop();
      braceDepth--;
      index = scanTemplate(index + 1);
    } else if (char === '/' && isRegexAllowed()) {
      const end = scanRegex(code, index);
      push('literal', index, end);
      index = end;
    } else if (IDENTIFIER_START.test(char)) {
      let end = index + 1;
      while (end < code.length && IDENTIFIER_PART.test(code[end])) end++;
      push('identifier', index, end);
      index = end;
    } else if (DIGIT.test(char) || (char === '.' && next !== undefined && DIGIT.test(next))) {
      let end = index + 1;
      while (end < code.length && /[\w.]/.test(code[end])) end++;
      push('literal', index, end);
      index = end;
    } else {
      const punctuator =
        MULTI_CHAR_PUNCTUATORS.find((candidate) => code.startsWith(candidate, index)) ?? char;
      if (punctuator === '{') braceDepth++;
      if (punctuator === '}') braceDepth--;
      push('punctuator', index, index + punctuator.length);
      index += punctuator.length;
    }
  }
  return tokens;
};

const isPropertyAccess = (previous: Token | undefined): boolean =>
  previous?.kind === 'punctuator' && (previous.value === '.' || previous.value === '?.');

const isObjectKey = (previous: Token | undefined, next: Token | undefined): boolean =>
  next?.value === ':' && (previous?.value === '{' || previous?.value === ',');

/** Names the code declares with `const`, `let`, `var`, `function` or `class`. */
const getDeclaredNames = (tokens: readonly Token[]): Set<string> =>
  new Set(
    tokens.flatMap((token, index) => {
      if (token.kind !== 'identifier') return [];
      const previous = tokens[index - 1];
      const beforeStar = previous?.value === '*' ? tokens[index - 2] : previous;
      return beforeStar && DECLARATION_KEYWORDS.has(beforeStar.value) ? [token.value] : [];
    })
  );

/** Identifier tokens that read a variable from an outer scope rather than naming a property. */
const getReferenceTokens = (tokens: readonly Token[]): Token[] => {
  const declared = getDeclaredNames(tokens);
  return tokens.filter((token, index) => {
    if (
      token.kind !== 'identifier' ||
      declared.has(token.value) ||
      RESERVED_WORDS.has(token.value)
    ) {
      return false;
    }
    const previous = tokens[index - 1];
    return !isPropertyAccess(previous) && !isObjectKey(previous, tokens[index + 1]);
  });
};

/** Free variables the code reads, in first-use order; matched against other cells' outputs. */
export const getCodeReferences = (code: string): string[] => [
  ...new Set(getReferenceTokens(tokenize(code)).map(({ value }) => value)),
];

/** The code with every reference to the variable `from` renamed to `to`. */
export const renameCodeReference = (code: string, from: string, to: string): string =>
  getReferenceTokens(tokenize(code))
    .filter(({ value }) => value === from)
    .reverse()
    .reduce(
      (renamed, { start, end }) => `${renamed.slice(0, start)}${to}${renamed.slice(end)}`,
      code
    );

interface CodeExport {
  name: string;
  local: string;
}

interface PreparedCode {
  /** The code with its `export` keywords and export lists removed. */
  body: string;
  exports: CodeExport[];
  error?: string;
}

const findClosingBrace = (tokens: readonly Token[], openIndex: number): number => {
  let depth = 0;
  for (let index = openIndex; index < tokens.length; index++) {
    if (tokens[index].value === '{') depth++;
    if (tokens[index].value === '}' && --depth === 0) return index;
  }
  return tokens.length - 1;
};

/** The name a declaration after `export` introduces, skipping `async` and generator stars. */
const getDeclarationName = (tokens: readonly Token[], index: number): string | undefined => {
  let cursor = index;
  if (tokens[cursor]?.value === 'async') cursor++;
  if (!DECLARATION_KEYWORDS.has(tokens[cursor]?.value ?? '')) return undefined;
  cursor++;
  if (tokens[cursor]?.value === '*') cursor++;
  const name = tokens[cursor];
  return name?.kind === 'identifier' ? name.value : undefined;
};

const prepareCode = (code: string): PreparedCode => {
  const tokens = tokenize(code);
  const exports: CodeExport[] = [];
  const removals: Array<{ start: number; end: number }> = [];
  let error: string | undefined;

  tokens.forEach((token, index) => {
    if (token.kind !== 'identifier' || token.value !== 'export') return;
    if (isPropertyAccess(tokens[index - 1]) || isObjectKey(tokens[index - 1], tokens[index + 1])) {
      return;
    }
    const next = tokens[index + 1];
    if (next?.value === 'default') {
      error ??=
        'Default exports are not supported; use named exports such as `export const total = …`';
      return;
    }
    if (next?.value === '{') {
      const closeIndex = findClosingBrace(tokens, index + 1);
      const specifiers = tokens.slice(index + 2, closeIndex);
      let cursor = 0;
      while (cursor < specifiers.length) {
        const local = specifiers[cursor];
        const hasAlias = specifiers[cursor + 1]?.value === 'as';
        const alias = hasAlias ? specifiers[cursor + 2] : local;
        if (local?.kind === 'identifier' && alias?.kind === 'identifier') {
          exports.push({ name: alias.value, local: local.value });
        }
        cursor += hasAlias ? 4 : 2;
      }
      const semicolon = tokens[closeIndex + 1];
      const end = semicolon?.value === ';' ? semicolon.end : tokens[closeIndex].end;
      removals.push({ start: token.start, end });
      return;
    }
    const name = getDeclarationName(tokens, index + 1);
    if (!name) {
      error ??=
        'Only `export const`, `let`, `var`, `function`, `class` and `export { … }` are supported';
      return;
    }
    exports.push({ name, local: name });
    removals.push({ start: token.start, end: next.start });
  });

  const body = removals
    .reverse()
    .reduce((current, { start, end }) => `${current.slice(0, start)}${current.slice(end)}`, code);
  return { body, exports, error };
};

/** Names the code exports, which become its outputs. */
export const getCodeExports = (code: string): string[] =>
  prepareCode(code).exports.map(({ name }) => name);

export type CodeLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface CodeLogEntry {
  level: CodeLogLevel;
  message: string;
}

export interface CodeRunResult {
  values: Record<string, unknown>;
  logs: CodeLogEntry[];
  error?: string;
  durationMs: number;
}

const MAX_PREVIEW_DEPTH = 3;
const MAX_PREVIEW_ITEMS = 20;

const formatEntries = (items: string[], total: number): string =>
  total > items.length ? [...items, '…'].join(', ') : items.join(', ');

const formatNested = (value: unknown, depth: number, seen: Set<object>): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (depth >= MAX_PREVIEW_DEPTH) return Array.isArray(value) ? `Array(${value.length})` : '{…}';

  const nested = new Set([...seen, value]);
  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_PREVIEW_ITEMS)
      .map((item) => formatNested(item, depth + 1, nested));
    return `[${formatEntries(items, value.length)}]`;
  }
  const entries = Object.entries(value);
  const items = entries
    .slice(0, MAX_PREVIEW_ITEMS)
    .map(([key, item]) => `${key}: ${formatNested(item, depth + 1, nested)}`);
  return `{${formatEntries(items, entries.length)}}`;
};

/** A one-line preview of any value, like a browser console's collapsed view. */
export const formatCodeValue = (value: unknown): string => formatNested(value, 0, new Set());

const formatLogArgument = (value: unknown): string =>
  typeof value === 'string' ? value : formatCodeValue(value);

type AsyncFunctionConstructor = new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;

const AsyncFunction: AsyncFunctionConstructor = Object.getPrototypeOf(async () => {}).constructor;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * The function body: inputs become root constants, and the code runs in a block inside that
 * scope so its own declarations may shadow them. Exports are returned as an object.
 */
const buildFunctionBody = ({ body, exports }: PreparedCode, inputNames: string[]): string => {
  const exported = exports
    .map(({ name, local }) => (name === local ? name : `${JSON.stringify(name)}: ${local}`))
    .join(', ');
  const injected = inputNames.length > 0 ? `const { ${inputNames.join(', ')} } = __inputs;` : '';
  return `"use strict";\n${injected}\n{\n${body}\n;return { ${exported} };\n}`;
};

const whenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_resolve, reject) => {
    if (signal.aborted) reject(signal.reason);
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Runs a code cell in the page, without sandboxing, and returns its exports and console output.
 * Synchronous code can't be interrupted; `signal` only stops waiting for async work.
 */
export const runCode = async ({
  code,
  inputs,
  signal,
}: {
  code: string;
  inputs: Readonly<Record<string, unknown>>;
  signal: AbortSignal;
}): Promise<CodeRunResult> => {
  const logs: CodeLogEntry[] = [];
  let isCapturing = true;
  const capture =
    (level: CodeLogLevel) =>
    (...args: unknown[]) => {
      console[level](...args);
      if (isCapturing) logs.push({ level, message: args.map(formatLogArgument).join(' ') });
    };
  const cellConsole = {
    ...console,
    log: capture('log'),
    info: capture('info'),
    warn: capture('warn'),
    error: capture('error'),
    debug: capture('debug'),
  };

  const prepared = prepareCode(code);
  if (prepared.error) return { values: {}, logs, error: prepared.error, durationMs: 0 };

  const startedAt = performance.now();
  const finish = (result: Omit<CodeRunResult, 'logs' | 'durationMs'>): CodeRunResult => {
    isCapturing = false;
    return { ...result, logs: [...logs], durationMs: Math.round(performance.now() - startedAt) };
  };
  try {
    const run = new AsyncFunction(
      '__inputs',
      'console',
      buildFunctionBody(prepared, Object.keys(inputs))
    );
    const result = await Promise.race([run(inputs, cellConsole), whenAborted(signal)]);
    return finish({ values: isRecord(result) ? { ...result } : {} });
  } catch (error) {
    return finish({ values: {}, error: getErrorMessage(error) });
  }
};
