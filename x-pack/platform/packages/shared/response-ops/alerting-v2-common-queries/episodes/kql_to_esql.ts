/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { fromKueryExpression, nodeTypes, type KueryNode } from '@kbn/es-query';
import moment from 'moment';

const KQL_WILDCARD_SYMBOL = '@kuery-wildcard@';
const DATA_FIELD_PREFIX = 'data.';
const DATA_FIELD_PATH_PATTERN = /^[a-zA-Z0-9_@-]+(?:\.[a-zA-Z0-9_@-]+)*$/;
const ESQL_RANGE_OPERATORS: Readonly<Record<string, string>> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

type EpisodeKqlFieldType = 'keyword' | 'number' | 'date' | 'data';

export const EPISODE_KQL_FIELDS: ReadonlyArray<{
  name: string;
  type: Exclude<EpisodeKqlFieldType, 'data'>;
}> = [
  { name: '@timestamp', type: 'date' },
  { name: 'alert.id', type: 'keyword' },
  { name: 'alert.status', type: 'keyword' },
  { name: 'rule.id', type: 'keyword' },
  { name: 'group_hash', type: 'keyword' },
  { name: 'severity', type: 'keyword' },
  { name: 'source', type: 'keyword' },
];

interface EpisodeKqlField {
  expression: string;
  name: string;
  type: EpisodeKqlFieldType;
}

export type EpisodeKqlTranslationErrorReason =
  | 'numericValue'
  | 'dateValue'
  | 'wildcard'
  | 'stringOrNumericRangeValue';

const TRANSLATION_ERROR_DETAILS: Record<EpisodeKqlTranslationErrorReason, string> = {
  numericValue: 'numeric value',
  dateValue: 'date value',
  wildcard: 'wildcards are not supported',
  stringOrNumericRangeValue: 'string or numeric range value',
};

export class EpisodeKqlTranslationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: EpisodeKqlTranslationErrorReason
  ) {
    super(`Unsupported episode KQL for ${field}: ${TRANSLATION_ERROR_DETAILS[reason]}`);
  }
}

const EPISODE_FIELD_EXPRESSIONS: Readonly<Record<string, string>> = {
  'alert.id': '`episode.id`',
  'alert.status': '`episode.status`',
  'rule.id': '`rule.id`',
};

const EPISODE_FIELDS: Readonly<Record<string, Omit<EpisodeKqlField, 'name'>>> = Object.fromEntries(
  EPISODE_KQL_FIELDS.map(({ name, type }) => [
    name,
    { expression: EPISODE_FIELD_EXPRESSIONS[name] ?? name, type },
  ])
);

const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;
const ESQL_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';

const unsupported = (detail: string): never => {
  throw new Error(`Unsupported episode KQL: ${detail}`);
};

const unsupportedForField = (field: string, reason: EpisodeKqlTranslationErrorReason): never => {
  throw new EpisodeKqlTranslationError(field, reason);
};

const getLiteralValue = (node: KueryNode): string | number | boolean | null => {
  if (!nodeTypes.literal.isNode(node)) {
    return unsupported('expected a literal');
  }
  return node.value;
};

const getField = (node: KueryNode): EpisodeKqlField | undefined => {
  if (!nodeTypes.literal.isNode(node) || typeof node.value !== 'string') {
    return;
  }
  const field = node.value;

  const episodeField = EPISODE_FIELDS[field];
  if (Object.hasOwn(EPISODE_FIELDS, field) && episodeField) {
    return { ...episodeField, name: field };
  }

  if (!field.startsWith(DATA_FIELD_PREFIX)) {
    return;
  }

  const path = field.slice(DATA_FIELD_PREFIX.length);
  if (!DATA_FIELD_PATH_PATTERN.test(path)) {
    return;
  }

  return {
    expression: `JSON_EXTRACT(episode_data, ${escapeStringValue(path)})`,
    name: field,
    type: 'data',
  };
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

const getNumericValueExpression = (field: string, node: KueryNode): string => {
  const value = getLiteralValue(node);
  if (typeof value === 'string' && NUMBER_PATTERN.test(value)) {
    return value;
  }

  return unsupportedForField(field, 'numericValue');
};

const getDateValueExpression = (field: string, node: KueryNode): string => {
  const value = getLiteralValue(node);
  if (typeof value === 'string' && moment.utc(value, ESQL_DATETIME_FORMAT, true).isValid()) {
    return `TO_DATETIME(${escapeStringValue(value)})`;
  }

  return unsupportedForField(field, 'dateValue');
};

const getComparison = (
  field: EpisodeKqlField,
  node: KueryNode
): { fieldExpression: string; valueExpression: string } => {
  const value = getLiteralValue(node);

  if (field.type === 'number') {
    return {
      fieldExpression: field.expression,
      valueExpression: getNumericValueExpression(field.name, node),
    };
  }

  if (field.type === 'date') {
    return {
      fieldExpression: field.expression,
      valueExpression: getDateValueExpression(field.name, node),
    };
  }

  if (
    field.type === 'data' &&
    typeof value === 'string' &&
    nodeTypes.literal.isNode(node) &&
    !node.isQuoted &&
    NUMBER_PATTERN.test(value)
  ) {
    return {
      fieldExpression: `TO_DOUBLE(${field.expression})`,
      valueExpression: value,
    };
  }

  if (field.type === 'data' && typeof value === 'boolean') {
    return {
      fieldExpression: field.expression,
      valueExpression: escapeStringValue(String(value)),
    };
  }

  return {
    fieldExpression: field.expression,
    valueExpression: getValueExpression(
      field.type === 'keyword' && typeof value === 'boolean' ? String(value) : value
    ),
  };
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
      const field = getField(firstArgument as KueryNode);
      return field ? `${field.expression} IS NOT NULL` : 'false';
    }
    case 'is': {
      const fieldNode = firstArgument as KueryNode;
      const valueNode = secondArgument as KueryNode;
      if (
        nodeTypes.wildcard.isNode(valueNode) &&
        nodeTypes.wildcard.isLoneWildcard(valueNode) &&
        ((nodeTypes.literal.isNode(fieldNode) && fieldNode.value === null) ||
          (nodeTypes.wildcard.isNode(fieldNode) && nodeTypes.wildcard.isLoneWildcard(fieldNode)))
      ) {
        return 'true';
      }
      const field = getField(fieldNode);
      if (!field) {
        return 'false';
      }
      if (nodeTypes.wildcard.isNode(valueNode)) {
        if (nodeTypes.wildcard.isLoneWildcard(valueNode)) {
          return `${field.expression} IS NOT NULL`;
        }
        if (field.type === 'number' || field.type === 'date') {
          return unsupportedForField(field.name, 'wildcard');
        }
        const pattern = valueNode.value.replaceAll(KQL_WILDCARD_SYMBOL, '*');
        return `${field.expression} LIKE ${escapeStringValue(pattern)}`;
      }
      const value = getLiteralValue(valueNode);
      if (value === null) {
        return `${field.expression} IS NULL`;
      }
      const comparison = getComparison(field, valueNode);
      return `${comparison.fieldExpression} == ${comparison.valueExpression}`;
    }
    case 'range': {
      const field = getField(firstArgument as KueryNode);
      if (!field) {
        return 'false';
      }
      const operator = String(secondArgument);
      const esqlOperator = ESQL_RANGE_OPERATORS[operator];
      if (!esqlOperator) {
        return unsupported(`range operator ${operator}`);
      }
      const valueNode = thirdArgument as KueryNode;
      const value = getLiteralValue(valueNode);
      if (field.type === 'data' && typeof value !== 'string') {
        return unsupportedForField(field.name, 'stringOrNumericRangeValue');
      }
      const comparison = getComparison(field, valueNode);
      return `${comparison.fieldExpression} ${esqlOperator} ${comparison.valueExpression}`;
    }
    default:
      return 'false';
  }
};

export const convertKqlToEsqlExpression = (kql: string): string => {
  return convertNode(fromKueryExpression(kql));
};
