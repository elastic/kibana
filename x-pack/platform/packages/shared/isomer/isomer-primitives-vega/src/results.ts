/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A host's query results for a spec's data sources, kept beside the spec rather than baked into it, so the spec stays
// as authored (as Dashboards as Code keeps a Vega panel's) and the results stay derived and replaceable.

import { isSpecObject, setOwn, type SpecObject } from './spec';

type Path = ReadonlyArray<string | number>;

/** One data source's result: what replaces the `url` of the data entry at `path`. */
export interface VegaResult {
  /** Path from the spec root to a data entry, such as `['data', 0]`. */
  path: Path;
  values: unknown;
  /** What the values serve: `static` holds only what a static drawing reads. */
  scope: 'static';
}

const at = (root: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (cursor, key) =>
      cursor !== null && typeof cursor === 'object'
        ? (cursor as Record<string | number, unknown>)[key]
        : undefined,
    root
  );

/** Where a result doesn't name a data entry in `spec`, the message why. */
export const resultIssues = (
  spec: SpecObject,
  results: readonly VegaResult[]
): Array<{ path: Path; message: string }> =>
  results.flatMap(({ path }, index) =>
    isSpecObject(at(spec, path))
      ? []
      : [{ path: ['results', index, 'path'], message: `names no data entry (${path.join('.')})` }]
  );

/** Whether `issuePath` is the `url` a result replaces. */
export const isResultUrl = (issuePath: Path, results: readonly VegaResult[] = []): boolean =>
  results.some(
    ({ path }) =>
      issuePath.length === path.length + 1 &&
      issuePath[path.length] === 'url' &&
      path.every((key, index) => issuePath[index] === key)
  );

/**
 * A copy of `spec` with each result's data entry holding its values in place of its `url`. Only the objects along
 * each path are copied; the values go in as given.
 */
export const withResults = (spec: SpecObject, results: readonly VegaResult[] = []): SpecObject => {
  let root: SpecObject = spec;
  for (const { path, values } of results) {
    if (!isSpecObject(at(root, path))) continue;
    const copyAlong = (node: unknown, depth: number): unknown => {
      if (depth === path.length) {
        const { url: _url, ...entry } = node as SpecObject;
        const copy: SpecObject = {};
        for (const [key, value] of Object.entries(entry)) setOwn(copy, key, value);
        setOwn(copy, 'values', values);
        return copy;
      }
      const key = path[depth]!;
      if (Array.isArray(node)) {
        const copy = [...node];
        copy[key as number] = copyAlong(node[key as number], depth + 1);
        return copy;
      }
      const copy: SpecObject = { ...(node as SpecObject) };
      setOwn(copy, String(key), copyAlong((node as SpecObject)[key as string], depth + 1));
      return copy;
    };
    root = copyAlong(root, 0) as SpecObject;
  }
  return root;
};

const ROWS = new Set(['values', 'datasets']);

/**
 * A compiled spec without `tooltip` encodings. A tooltip only shows on hover, so a static drawing never draws one,
 * and its expression would otherwise read data the drawing doesn't.
 */
export const withoutTooltips = (spec: SpecObject): SpecObject => {
  const visit = (value: unknown, key: string | undefined): unknown => {
    if (Array.isArray(value)) return value.map((item) => visit(item, undefined));
    if (!isSpecObject(value)) return value;
    const copy: SpecObject = {};
    for (const [childKey, child] of Object.entries(value)) {
      if (key === 'encode' && isSpecObject(child)) {
        const { tooltip: _tooltip, ...set } = child;
        setOwn(copy, childKey, set);
      } else {
        setOwn(copy, childKey, ROWS.has(childKey) ? child : visit(child, childKey));
      }
    }
    return copy;
  };
  return visit(spec, undefined) as SpecObject;
};

/** What a run read of a value: everything under it, or these keys. */
export interface ReadRecord {
  all: boolean;
  keys: Map<string, ReadRecord>;
}

export const newReadRecord = (): ReadRecord => ({ all: false, keys: new Map() });

/**
 * `value` behind proxies that record every read into `record`. Listing keys counts as reading everything below,
 * so a copy, `for…in`, or type inference keeps the whole subtree. Writes, and symbol keys such as the tuple id Vega
 * tags rows with, pass through to the value.
 */
export const recordReads = (value: unknown, record: ReadRecord): unknown => {
  const proxies = new WeakMap<object, unknown>();
  const wrap = (target: unknown, into: ReadRecord): unknown => {
    if (target === null || typeof target !== 'object') return target;
    const cached = proxies.get(target);
    if (cached) return cached;
    const child = (key: string) => {
      let next = into.keys.get(key);
      if (!next) {
        next = newReadRecord();
        into.keys.set(key, next);
      }
      return next;
    };
    const proxy = new Proxy(target, {
      get: (object, key, receiver) => {
        const read = Reflect.get(object, key, receiver);
        return typeof key === 'symbol' ? read : wrap(read, child(key));
      },
      has: (object, key) => {
        if (typeof key !== 'symbol') child(key);
        return Reflect.has(object, key);
      },
      getOwnPropertyDescriptor: (object, key) => {
        if (typeof key !== 'symbol') child(key);
        return Reflect.getOwnPropertyDescriptor(object, key);
      },
      ownKeys: (object) => {
        into.all = true;
        return Reflect.ownKeys(object);
      },
    });
    proxies.set(target, proxy);
    return proxy;
  };
  return wrap(value, record);
};

/**
 * `value` holding only what `record` saw read. An array keeps its length, its unread items `null`, so a spec that
 * counts rows counts the same.
 */
export const pruneToReads = (value: unknown, record: ReadRecord): unknown => {
  if (record.all || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const read = record.keys.get(String(index));
      return read ? pruneToReads(item, read) : null;
    });
  }
  const pruned: SpecObject = {};
  for (const [key, read] of record.keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      setOwn(pruned, key, pruneToReads((value as SpecObject)[key], read));
    }
  }
  return pruned;
};

/** A stand-in for result `index`'s values, found again after the spec compiles. */
export const resultMarker = (index: number) => [{ __isomerResult: index }];

const isMarker = (value: unknown): value is Array<{ __isomerResult: number }> =>
  Array.isArray(value) &&
  value.length === 1 &&
  isSpecObject(value[0]) &&
  typeof value[0].__isomerResult === 'number';

/** Replaces each marker in a compiled spec, in place, with what `replace` gives for its result. */
export const replaceMarkers = (
  spec: SpecObject,
  replace: (index: number) => unknown
): Set<number> => {
  const found = new Set<number>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isSpecObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (ROWS.has(key) && isMarker(child)) {
        const index = child[0]!.__isomerResult;
        found.add(index);
        setOwn(value, key, replace(index));
      } else if (key === 'datasets' && isSpecObject(child)) {
        for (const [name, rows] of Object.entries(child)) {
          if (isMarker(rows)) {
            found.add(rows[0]!.__isomerResult);
            setOwn(child, name, replace(rows[0]!.__isomerResult));
          }
        }
      } else {
        visit(child);
      }
    }
  };
  visit(spec);
  return found;
};
