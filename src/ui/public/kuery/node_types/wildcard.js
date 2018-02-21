import { fromLiteralExpression } from '../ast/ast';

export const wildcardSymbol = Symbol('*');

// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
function escapeQueryString(string) {
  return string.replace(/[+-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&'); // $& means the whole matched string
}

export function buildNode(value) {
  if (typeof value === 'string') {
    return fromLiteralExpression(value);
  }

  return {
    type: 'wildcard',
    value,
  };
}

export function test(node, string) {
  const { value } = node;
  const regex = value.map(sequence => {
    if (typeof sequence === 'symbol') {
      return '.*';
    } else {
      return escapeRegExp(sequence);
    }
  }).join('');
  const regexp = new RegExp(`^${regex}$`);
  return regexp.test(string);
}

export function toElasticsearchQuery(node) {
  const { value } = node;
  return value.map(sequence => {
    if (typeof sequence === 'symbol') {
      return '*';
    } else {
      return sequence;
    }
  }).join('');
}

export function toQueryStringQuery(node) {
  const { value } = node;
  return value.map(sequence => {
    if (typeof sequence === 'symbol') {
      return '*';
    } else {
      return escapeQueryString(sequence);
    }
  }).join('');
}
