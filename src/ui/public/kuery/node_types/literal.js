import _ from 'lodash';

export function buildNode(value) {
  return {
    type: 'literal',
    value,
  };
}

export function toElasticsearchQuery(node) {
  return node.value;
}

export function toKueryExpression(node) {
  if (_.isString(node.value)) {
    const escapedValue = node.value.replace(/"/g, '\\"');
    return `"${escapedValue}"`;
  }

  return node.value;
}
