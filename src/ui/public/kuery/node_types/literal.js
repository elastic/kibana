export function buildNode(value) {
  return {
    type: 'literal',
    value,
  };
}

export function toElasticsearchQuery(node) {
  return node.value;
}

