export function buildNode({ field, values, operation }) {
  const negate = operation === '-';

  return {
    type: 'match',
    negate,
    params: {
      field,
      value: values
    }
  };
}

export function toElasticsearchQuery(node) {
  return {
    match: {
      [node.params.field]: node.params.value
    }
  };
}

export function toKueryExpression(node) {
  if (!node) {
    return '';
  }

  const operator = node.negate ? '-' : '';
  const escapedValue = node.params.value.replace(/"/g, '\\"');
  const operand = `${node.params.field}:"${escapedValue}"`;
  return operator + operand;
}
