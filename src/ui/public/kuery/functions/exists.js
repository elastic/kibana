import * as literal from '../node_types/literal';
import { getFieldByName } from '../../index_patterns/static_utils';

export function buildNodeParams(fieldName) {
  return {
    arguments: [literal.buildNode(fieldName)],
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const { arguments: [ fieldNameArg ] } = node;
  const fieldName = literal.toElasticsearchQuery(fieldNameArg);
  const field = getFieldByName(indexPattern.fields, fieldName);

  if (field && field.scripted) {
    throw new Error(`Exists query does not support scripted fields`);
  }
  return {
    exists: { field: fieldName }
  };
}
