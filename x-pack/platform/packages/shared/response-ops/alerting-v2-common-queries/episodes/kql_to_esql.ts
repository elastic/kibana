/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { fromKueryExpression, nodeTypes, type KueryNode } from '@kbn/es-query';

const KQL_WILDCARD_SYMBOL = '@kuery-wildcard@';
const DATA_FIELD_PREFIX = 'data.';
const DATA_FIELD_PATH_PATTERN = /^[a-zA-Z0-9_@-]+(?:\.[a-zA-Z0-9_@-]+)*$/;
const ESQL_RANGE_OPERATORS: Readonly<Record<string, string>> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

const EPISODE_FIELD_EXPRESSIONS: Readonly<Record<string, string>> = {
  '@timestamp': '@timestamp',
  'episode.id': '`episode.id`',
  'episode.status': '`episode.status`',
  'rule.id': '`rule.id`',
  group_hash: 'group_hash',
  severity: 'severity',
  source: 'source',
  duration: 'duration',
};

const unsupported = (detail: string): never => {
  throw new Error(`Unsupported episode KQL: ${detail}`);
};

const getLiteralValue = (node: KueryNode): string | number | boolean | null => {
  if (!nodeTypes.literal.isNode(node)) {
    return unsupported('expected a literal');
  }
  return node.value;
};

const getFieldExpression = (node: KueryNode): string | undefined => {
  if (!nodeTypes.literal.isNode(node) || typeof node.value !== 'string') {
    return;
  }
  const field = node.value;

  const episodeField = EPISODE_FIELD_EXPRESSIONS[field];
  if (episodeField) {
    return episodeField;
  }

  if (!field.startsWith(DATA_FIELD_PREFIX)) {
    return;
  }

  const path = field.slice(DATA_FIELD_PREFIX.length);
  if (!DATA_FIELD_PATH_PATTERN.test(path)) {
    return;
  }

  return `JSON_EXTRACT(episode_data, ${escapeStringValue(path)})`;
};

const getValueExpression = (value: string | number | boolean | null): string => {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return escapeStringValue(value);
  }
  return String(value);
};

const getRangeValueExpression = (field: string, node: KueryNode): string => {
  const value = getLiteralValue(node);
  if (
    field === 'duration' &&
    typeof value === 'string' &&
    nodeTypes.literal.isNode(node) &&
    !node.isQuoted &&
    /^-?\d+(?:\.\d+)?$/.test(value)
  ) {
    return value;
  }

  return getValueExpression(value);
};

const convertNode = (node: KueryNode): string => {
  if (!nodeTypes.function.isNode(node)) {
    return 'false';
  }

  const [firstArgument, secondArgument, thirdArgument] = node.arguments;

  switch (node.function) {
    case 'and':
    case 'or': {
      const operator = node.function.toUpperCase();
      return `(${(node.arguments as KueryNode[]).map(convertNode).join(` ${operator} `)})`;
    }
    case 'not':
      return `COALESCE(NOT (${convertNode(firstArgument as KueryNode)}), true)`;
    case 'exists': {
      const field = getFieldExpression(firstArgument as KueryNode);
      return field ? `${field} IS NOT NULL` : 'false';
    }
    case 'is': {
      const field = getFieldExpression(firstArgument as KueryNode);
      if (!field) {
        return 'false';
      }
      const valueNode = secondArgument as KueryNode;
      if (nodeTypes.wildcard.isNode(valueNode)) {
        if (nodeTypes.wildcard.isLoneWildcard(valueNode)) {
          return `${field} IS NOT NULL`;
        }
        const pattern = valueNode.value.replaceAll(KQL_WILDCARD_SYMBOL, '*');
        return `${field} LIKE ${escapeStringValue(pattern)}`;
      }
      const value = getLiteralValue(valueNode);
      const fieldName = getLiteralValue(firstArgument as KueryNode);
      if (typeof value === 'boolean' && String(fieldName).startsWith(DATA_FIELD_PREFIX)) {
        return `${field} == ${escapeStringValue(String(value))}`;
      }
      return value === null ? `${field} IS NULL` : `${field} == ${getValueExpression(value)}`;
    }
    case 'range': {
      const field = getFieldExpression(firstArgument as KueryNode);
      if (!field) {
        return 'false';
      }
      const fieldName = getLiteralValue(firstArgument as KueryNode);
      const operator = String(secondArgument);
      const esqlOperator = ESQL_RANGE_OPERATORS[operator];
      if (!esqlOperator) {
        return unsupported(`range operator ${operator}`);
      }
      return `${field} ${esqlOperator} ${getRangeValueExpression(
        String(fieldName),
        thirdArgument as KueryNode
      )}`;
    }
    default:
      return 'false';
  }
};

export const convertKqlToEsqlExpression = (kql: string): string => {
  return convertNode(fromKueryExpression(kql));
};
