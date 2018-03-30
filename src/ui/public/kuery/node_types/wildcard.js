import { fromLiteralExpression } from '../ast/ast';

export const wildcardSymbol = '@kuery-wildcard@';

// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
function escapeQueryString(string) {
  return string.replace(/[+-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&'); // $& means the whole matched string
}

export function buildNode(value) {
  if (!value.includes(wildcardSymbol)) {
    return fromLiteralExpression(value);
  }

  return {
    type: 'wildcard',
    value,
  };
}

export function test(node, string) {
  const { value } = node;
  const regex = value
    .split(wildcardSymbol)
    .map(escapeRegExp)
    .join('.*');
  const regexp = new RegExp(`^${regex}$`);
  return regexp.test(string);
}

export function toElasticsearchQuery(node) {
  const { value } = node;
  return value.split(wildcardSymbol).join('*');
}

export function toQueryStringQuery(node) {
  const { value } = node;
  return value
    .split(wildcardSymbol)
    .map(escapeQueryString)
    .join('*');
}

export function hasLeadingWildcard(node) {
  const { value } = node;
  // A lone wildcard turns into an `exists` query, so we're only concerned with
  // leading wildcards followed by additional characters.
  return (
    value.startsWith(wildcardSymbol) &&
    value.replace(wildcardSymbol, '').length > 0
  );
}
