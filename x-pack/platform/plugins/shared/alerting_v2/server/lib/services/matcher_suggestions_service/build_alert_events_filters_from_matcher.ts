/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

const SUPPORTED_MATCHER_FIELDS: ReadonlySet<string> = new Set([
  'episode_status',
  'episode_id',
  'group_hash',
  'rule.id',
]);

const MATCHER_TO_ES_FIELD: Readonly<Record<string, string>> = {
  episode_status: 'episode.status',
  episode_id: 'episode.id',
};

const ALERT_EVENTS_DATA_VIEW: DataViewBase = {
  title: 'alert_events',
  fields: [
    { name: 'episode.status', type: 'string', esTypes: ['keyword'] },
    { name: 'episode.id', type: 'string', esTypes: ['keyword'] },
    { name: 'group_hash', type: 'string', esTypes: ['keyword'] },
    { name: 'rule.id', type: 'string', esTypes: ['keyword'] },
  ],
};

const isFieldSupported = (fieldName: string): boolean =>
  fieldName.startsWith('data.') || SUPPORTED_MATCHER_FIELDS.has(fieldName);

const rewriteFieldArg = (node: KueryNode): KueryNode | null => {
  const fieldArg = node.arguments[0];
  if (!fieldArg || fieldArg.type !== 'literal' || typeof fieldArg.value !== 'string') {
    return null;
  }
  const fieldName: string = fieldArg.value;
  if (!isFieldSupported(fieldName)) {
    return null;
  }
  const translated = MATCHER_TO_ES_FIELD[fieldName] ?? fieldName;
  if (translated === fieldName) {
    return node;
  }
  return {
    ...node,
    arguments: [{ ...fieldArg, value: translated }, ...node.arguments.slice(1)],
  };
};

// Walks the KQL AST and drops leaves whose field is not in SUPPORTED_MATCHER_FIELDS
// (or under `data.*`), collapsing now-empty `and`/`or`/`not`/`nested` parents.
// Returns `null` when the whole subtree is pruned. Example:
//   In:  rule.id : "r1" and rule.name : "x"   (rule.name is not in the alert_events mapping)
//   Out: rule.id : "r1"                        (the `and` collapses to its surviving child)
const pruneNode = (node: KueryNode): KueryNode | null => {
  if (node.type !== 'function') {
    return node;
  }

  switch (node.function) {
    case 'and':
    case 'or': {
      const pruned: KueryNode[] = [];
      for (const arg of node.arguments as KueryNode[]) {
        const child = pruneNode(arg);
        if (child !== null) pruned.push(child);
      }
      if (pruned.length === 0) return null;
      if (pruned.length === 1) return pruned[0];
      return { ...node, arguments: pruned };
    }
    case 'not': {
      const inner = pruneNode(node.arguments[0]);
      if (inner === null) return null;
      return { ...node, arguments: [inner] };
    }
    case 'nested': {
      const inner = pruneNode(node.arguments[1]);
      if (inner === null) return null;
      return { ...node, arguments: [node.arguments[0], inner] };
    }
    case 'is':
    case 'range':
    case 'exists':
      return rewriteFieldArg(node);
    default:
      throw new Error(`Unsupported KQL function "${node.function}" in matcher`);
  }
};

export const buildAlertEventsFiltersFromMatcher = (matcher: string): QueryDslQueryContainer[] => {
  const trimmed = matcher.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const ast = fromKueryExpression(trimmed);
    const pruned = pruneNode(ast);
    if (!pruned) {
      return [];
    }
    return [toElasticsearchQuery(pruned, ALERT_EVENTS_DATA_VIEW)];
  } catch {
    return [];
  }
};
