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
