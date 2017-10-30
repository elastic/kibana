import * as ast from '../ast';
import * as literal from '../node_types/literal';

export function buildNodeParams(fieldName) {
  return {
    arguments: [literal.buildNode(fieldName)],
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const { arguments: [ fieldNameArg ] } = node;
  const fieldName = literal.toElasticsearchQuery(fieldNameArg);
  const field = indexPattern.fields.byName[fieldName];

  if (field && field.scripted) {
    throw new Error(`Exists query does not support scripted fields`);
  }
  return {
    exists: { field: fieldName }
  };
}

export function getSuggestions(node, cursorPosition) {
  const childAtCursor = ast.getChildAtCursor(node, cursorPosition) || {};
  const { location, value = '' } = childAtCursor;

  const start = location ? location.min : cursorPosition;
  const end = location ? location.max : cursorPosition;

  const types = ['field'];
  const params = { query: value };

  return { start, end, types, params };
}
