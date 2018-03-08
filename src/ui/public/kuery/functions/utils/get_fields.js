import * as literal from '../../node_types/literal';
import * as wildcard from '../../node_types/wildcard';

export function getFields(node, indexPattern) {
  if (node.type === 'literal') {
    const fieldName = literal.toElasticsearchQuery(node);
    const field = indexPattern.fields.byName[fieldName];
    if (!field) {
      throw new Error(`Field ${fieldName} does not exist in index pattern ${indexPattern.title}`);
    }
    return [field];
  } else if (node.type === 'wildcard') {
    const fields = indexPattern.fields.filter(field => wildcard.test(node, field.name));
    if (fields.length === 0) {
      throw new Error(`No fields match the pattern ${wildcard.toElasticsearchQuery(node)} in index pattern ${indexPattern.title}`);
    }
    return fields;
  }
}
