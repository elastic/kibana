import * as literal from '../../node_types/literal';
import * as wildcard from '../../node_types/wildcard';
import { getFieldByName } from '../../../index_patterns/static_utils';



export function getFields(node, indexPattern) {
  if (node.type === 'literal') {
    const fieldName = literal.toElasticsearchQuery(node);
    const field = getFieldByName(indexPattern.fields, fieldName);
    if (!field) {
      return [];
    }
    return [field];
  } else if (node.type === 'wildcard') {
    const fields = indexPattern.fields.filter(field => wildcard.test(node, field.name));
    return fields;
  }
}
