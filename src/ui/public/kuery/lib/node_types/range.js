export function buildNode({ field, params, operation }) {
  const negate = operation === '-';

  return {
    type: 'range',
    negate,
    params: {
      field,
      gt: params.gt,
      lt: params.lt,
    }
  };
}

export function toElasticsearchQuery(node) {
  return {
    range: {
      [node.params.field]: {
        gt: node.params.gt,
        lt: node.params.lt
      }
    }
  };
}

export function toKueryExpression(node) {
  if (!node) {
    return '';
  }

  const operator = node.negate ? '-' : '';
  const operand = `${node.params.field}:[${node.params.gt} to ${node.params.lt}]`;
  return operator + operand;
}
