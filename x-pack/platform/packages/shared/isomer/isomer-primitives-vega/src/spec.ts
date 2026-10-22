/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A JSON object: a Vega or Vega-Lite spec, or any object inside one. */
export interface SpecObject {
  [key: string]: unknown;
}

/** One place a spec reaches outside itself. */
export interface SpecIssue {
  /** Path from the spec root, such as `['data', 0, 'url']`. */
  path: (string | number)[];
  message: string;
}

export const URL_MESSAGE = 'a chart cannot load anything by URL; inline its data under `values`';
export const HREF_MESSAGE = 'a chart cannot link out; remove `href`';
export const BIND_ELEMENT_MESSAGE =
  'a bound input cannot target an element outside the chart; remove `element`';
export const DEPTH_MESSAGE = 'nests deeper than a chart spec needs';

/** Deeper than any real spec, shallow enough that a hostile one cannot exhaust the stack. */
export const MAX_SPEC_DEPTH = 64;

export const isSpecObject = (value: unknown): value is SpecObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type Path = (string | number)[];

const INLINE_DATA_KEYS = new Set(['values', 'datasets']);

const CURSOR_KEYWORD = /^[a-z-]+$/i;

/** A cursor written as a keyword, bare or as `{ value }`; anything else could name an image. */
const isKeywordCursor = (value: unknown): boolean =>
  typeof value === 'string'
    ? CURSOR_KEYWORD.test(value)
    : isSpecObject(value) &&
      Object.keys(value).length === 1 &&
      typeof value.value === 'string' &&
      CURSOR_KEYWORD.test(value.value);

/**
 * Assigns as an own property, so a JSON `__proto__` key stays data instead of setting the prototype. Only that key
 * reaches a setter on a plain object, so every other key assigns directly, which is far faster on large rows.
 */
export const setOwn = (target: SpecObject, key: string, value: unknown) => {
  if (key === '__proto__') {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  } else {
    target[key] = value;
  }
  return target;
};

/** A fresh copy of inline rows, which Vega tags in place as it ingests them. */
const copyData = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(copyData);
  }
  if (!isSpecObject(value)) {
    return value;
  }
  const copy: SpecObject = {};
  for (const [key, child] of Object.entries(value)) {
    setOwn(copy, key, copyData(child));
  }
  return copy;
};

/**
 * Rebuilds `value`, applying the URL, href, and bound-element rules at every
 * object key. Inline `values` and Vega-Lite `datasets` are rows, not spec, so
 * the walk never enters them: a column named `url` is data.
 */
const walk = (
  value: unknown,
  path: Path,
  depth: number,
  report: (issue: SpecIssue) => void,
  parentKey: string | undefined,
  rows: (value: unknown) => unknown = copyData
): unknown => {
  if (depth > MAX_SPEC_DEPTH) {
    report({ path, message: DEPTH_MESSAGE });
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      walk(item, [...path, index], depth + 1, report, undefined, rows)
    );
  }
  if (!isSpecObject(value)) {
    return value;
  }
  const result: SpecObject = {};
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (key === 'url') {
      report({ path: childPath, message: URL_MESSAGE });
      continue;
    }
    if (key === 'href') {
      report({ path: childPath, message: HREF_MESSAGE });
      continue;
    }
    if (key === 'element' && parentKey === 'bind') {
      report({ path: childPath, message: BIND_ELEMENT_MESSAGE });
      continue;
    }
    if (key === 'usermeta' || (key === 'cursor' && !isKeywordCursor(child))) {
      continue;
    }
    setOwn(
      result,
      key,
      INLINE_DATA_KEYS.has(key) ? rows(child) : walk(child, childPath, depth + 1, report, key, rows)
    );
  }
  return result;
};

/** Every place `spec` reaches outside itself. Empty for a self-contained spec. */
export const specIssues = (spec: SpecObject): SpecIssue[] => {
  const issues: SpecIssue[] = [];
  walk(spec, [], 0, (issue) => issues.push(issue), undefined);
  return issues;
};

/**
 * A copy of `spec` with every `url`, `href`, bound `element`, `usermeta`, and
 * non-keyword `cursor` removed, and anything past {@link MAX_SPEC_DEPTH} dropped.
 */
export const stripSpec = (spec: SpecObject): SpecObject =>
  walk(spec, [], 0, () => undefined, undefined) as SpecObject;

const hardenStripped = (safe: SpecObject): SpecObject => {
  const config = isSpecObject(safe.config) ? safe.config : {};
  const events = isSpecObject(config.events) ? config.events : {};
  return {
    ...safe,
    config: {
      ...config,
      events: { ...events, selector: false, globalCursor: false },
    },
  };
};

/**
 * A compiled Vega spec as it may run: {@link stripSpec}ped, with event streams
 * barred from selecting elements outside the chart by CSS selector, and the
 * cursor kept off the page's `body`.
 */
export const hardenVegaSpec = (spec: SpecObject): SpecObject => hardenStripped(stripSpec(spec));

/**
 * {@link hardenVegaSpec} for a spec built from one this module already stripped, such as Vega-Lite's compilation of
 * it: stripped again, but its rows, already copied, are shared rather than copied twice.
 */
export const hardenBuiltSpec = (spec: SpecObject): SpecObject =>
  hardenStripped(
    walk(
      spec,
      [],
      0,
      () => undefined,
      undefined,
      (rows) => rows
    ) as SpecObject
  );
