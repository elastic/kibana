/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface JsonObject {
  [key: string]: Json;
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getObject = (value: unknown, ...path: string[]): JsonObject | undefined => {
  let current: unknown = value;
  for (const key of path) {
    if (!isObject(current)) {
      return undefined;
    }
    current = current[key];
  }
  return isObject(current) ? current : undefined;
};

/**
 * Lens generates layer and column IDs, so stored state that went through the API format has new
 * ones. Maps each ID to a stable name: layers by the order the visualization lists them (then the
 * datasource order), columns by operation and field, numbered when they repeat in a layer.
 */
export const getLensIdAliases = (attributes: unknown): Map<string, string> => {
  const aliases = new Map<string, string>();
  const datasources = getObject(attributes, 'state', 'datasourceStates') ?? {};
  const visualization = getObject(attributes, 'state', 'visualization') ?? {};

  const layerOrder: string[] = [];
  const addLayer = (layerId: unknown) => {
    if (typeof layerId === 'string' && !layerOrder.includes(layerId)) {
      layerOrder.push(layerId);
    }
  };
  if (Array.isArray(visualization.layers)) {
    visualization.layers.forEach((layer) => addLayer(isObject(layer) ? layer.layerId : undefined));
  }
  addLayer(visualization.layerId);
  for (const datasource of Object.values(datasources)) {
    Object.keys(getObject(datasource, 'layers') ?? {}).forEach(addLayer);
  }
  layerOrder.forEach((layerId, index) => aliases.set(layerId, `<layer_${index}>`));

  for (const [id, dataView] of Object.entries(
    getObject(attributes, 'state', 'adHocDataViews') ?? {}
  )) {
    const name = isObject(dataView) ? dataView.name ?? dataView.title : undefined;
    aliases.set(id, `<data_view:${typeof name === 'string' ? name : id}>`);
  }

  for (const datasource of Object.values(datasources)) {
    for (const [layerId, layer] of Object.entries(getObject(datasource, 'layers') ?? {})) {
      const layerAlias = aliases.get(layerId) ?? '<layer>';
      const counts = new Map<string, number>();
      const name = (signature: string) => {
        const count = counts.get(signature) ?? 0;
        counts.set(signature, count + 1);
        return `<${layerAlias.slice(1, -1)}:${signature}${count ? `#${count}` : ''}>`;
      };

      const columns = isObject(layer) ? layer.columns : undefined;
      if (isObject(columns)) {
        const order = isObject(layer) && Array.isArray(layer.columnOrder) ? layer.columnOrder : [];
        const ids = [
          ...order.filter((id): id is string => typeof id === 'string' && id in columns),
          ...Object.keys(columns).filter((id) => !order.includes(id)),
        ];
        for (const id of ids) {
          const column = columns[id];
          const operation = isObject(column) ? column.operationType : undefined;
          const field = isObject(column) ? column.sourceField : undefined;
          aliases.set(
            id,
            name(`${operation ?? 'column'}(${typeof field === 'string' ? field : ''})`)
          );
        }
      } else if (Array.isArray(columns)) {
        for (const column of columns) {
          if (isObject(column) && typeof column.columnId === 'string') {
            const field = typeof column.fieldName === 'string' ? column.fieldName : '';
            aliases.set(column.columnId, name(`esql(${field})`));
          }
        }
      }
    }
  }
  return aliases;
};

/** IDs long enough to be generated, so they are also replaced inside longer strings. */
const GENERATED_ID_MIN_LENGTH = 16;

const FIELD_NAME_KEYS = new Set(['fieldName', 'sourceField']);

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces generated IDs, in keys and values, with their aliases. A string that is an ID is
 * replaced whole. Inside longer strings (reference names such as
 * `indexpattern-datasource-layer-<id>`), long IDs are replaced anywhere and layer IDs as whole
 * tokens. Short IDs and IDs with spaces are left alone inside strings: ES|QL column IDs are column
 * names, which also appear in query text and titles.
 */
export const replaceIds = (value: unknown, aliases: Map<string, string>): Json => {
  const embedded = [...aliases.entries()]
    .filter(
      ([id, alias]) =>
        !/\s/.test(id) && (id.length >= GENERATED_ID_MIN_LENGTH || /^<layer_\d+>$/.test(alias))
    )
    .sort(([a], [b]) => b.length - a.length)
    .map(([id, alias]) => ({
      pattern: new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(id)}(?=$|[^A-Za-z0-9_])`, 'g'),
      alias,
    }));
  const replaceString = (text: string): string => {
    const exact = aliases.get(text);
    if (exact) {
      return exact;
    }
    return embedded.reduce(
      (result, { pattern, alias }) =>
        result.replace(pattern, (_, prefix: string) => prefix + alias),
      text
    );
  };
  const visit = (node: unknown): Json => {
    if (typeof node === 'string') {
      return replaceString(node);
    }
    if (Array.isArray(node)) {
      return node.map(visit);
    }
    if (isObject(node)) {
      return Object.fromEntries(
        Object.entries(node).map(([key, child]) => [
          replaceString(key),
          // Field names are data, even when an ES|QL column ID equals one.
          FIELD_NAME_KEYS.has(key) ? ((child ?? null) as Json) : visit(child),
        ])
      );
    }
    return (node ?? null) as Json;
  };
  return visit(value);
};

export interface JsonDifference {
  /** Dotted path; array items are `[index]`. */
  path: string;
  kind: 'removed' | 'added' | 'changed';
  before?: Json;
  after?: Json;
}

/** Keys that identify an item in a Lens array of objects, in order of preference. */
const IDENTITY_KEYS = ['columnId', 'layerId', 'forAccessor', 'name'] as const;

/** The key both arrays' items are uniquely identified by, so items are matched by it, not position. */
const getIdentityKey = (before: Json[], after: Json[]): string | undefined =>
  IDENTITY_KEYS.find((key) =>
    [before, after].every((items) => {
      const values = items.map((item) => (isObject(item) ? item[key] : undefined));
      return (
        items.length > 0 &&
        values.every((value) => typeof value === 'string') &&
        new Set(values).size === values.length
      );
    })
  );

const isEmpty = (value: Json | undefined) =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0) ||
  (isObject(value) && Object.keys(value).length === 0);

/**
 * Lists the leaves where `after` differs from `before`. Arrays of strings compare as sets (Lens
 * keeps lists such as `columnOrder` and `accessors` in an order that carries no meaning). Arrays of
 * objects that carry an identity (`columnId`, `layerId`, `forAccessor`, `name`) are matched on it
 * and reported as `[id]`; other arrays compare item by item. A key missing on one side and empty (`null`, `[]`, `{}`) on the
 * other is not a difference.
 */
export const diffJson = (
  before: Json | undefined,
  after: Json | undefined,
  path = ''
): JsonDifference[] => {
  if (isEmpty(before) && isEmpty(after)) {
    return [];
  }
  // A missing object is compared as `{}`, so the difference is reported field by field.
  if (before === undefined) {
    return isObject(after) ? diffJson({}, after, path) : [{ path, kind: 'added', after }];
  }
  if (after === undefined) {
    return isObject(before) ? diffJson(before, {}, path) : [{ path, kind: 'removed', before }];
  }
  if (isObject(before) && isObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((key) => diffJson(before[key], after[key], path ? `${path}.${key}` : key));
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const allStrings = [...before, ...after].every((item) => typeof item === 'string');
    if (allStrings) {
      const sortedBefore = [...(before as string[])].sort();
      const sortedAfter = [...(after as string[])].sort();
      return JSON.stringify(sortedBefore) === JSON.stringify(sortedAfter)
        ? []
        : [{ path, kind: 'changed', before, after }];
    }
    const identity = getIdentityKey(before, after);
    if (identity) {
      const toMap = (items: Json[]) =>
        Object.fromEntries(items.map((item) => [(item as JsonObject)[identity] as string, item]));
      const keys = [
        ...new Set([...Object.keys(toMap(before)), ...Object.keys(toMap(after))]),
      ].sort();
      const beforeMap = toMap(before);
      const afterMap = toMap(after);
      return keys.flatMap((key) => diffJson(beforeMap[key], afterMap[key], `${path}[${key}]`));
    }
    const length = Math.max(before.length, after.length);
    return Array.from({ length }, (_, index) =>
      diffJson(before[index], after[index], `${path}[${index}]`)
    ).flat();
  }
  return JSON.stringify(before) === JSON.stringify(after)
    ? []
    : [{ path, kind: 'changed', before, after }];
};

/** A path with array indexes and per-layer column aliases generalized, for grouping across panels. */
export const toFieldPattern = (path: string): string =>
  path
    .replace(/\[[^\]]*\]/g, '[]')
    .replace(/<layer_\d+:[^>]*>/g, '<column>')
    .replace(/<layer_\d+>/g, '<layer>');

/**
 * Diffs two Lens attributes after replacing each side's generated IDs with stable aliases.
 * `references` are compared too, so a lost data view reference shows up.
 */
export const diffLensAttributes = (before: unknown, after: unknown): JsonDifference[] =>
  diffJson(
    replaceIds(before, getLensIdAliases(before)),
    replaceIds(after, getLensIdAliases(after))
  );
