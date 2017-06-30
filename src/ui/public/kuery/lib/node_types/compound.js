import {
  toElasticsearchQuery as nodeToElasticsearchQuery,
  toKueryExpression as nodeToKueryExpression,
} from '../ast';

export function buildNode({ children, operation }) {
  const negate = operation === '-';

  return {
    type: 'compound',
    negate,
    params: {
      children
    }
  };
}

export function toElasticsearchQuery(node) {
  const query = {
    bool: {
      must: [],
      filter: [],
      should: [],
      must_not: [],
    }
  };

  return node.params.children.reduce((acc, childNode) => {
    const childNodeQuery = nodeToElasticsearchQuery(childNode);

    if (childNode.negate) {
      acc.bool.must_not.push(childNodeQuery);
    }
    else {
      acc.bool.filter.push(childNodeQuery);
    }

    return acc;
  }, query);
}

export function toKueryExpression(node) {
  if (!node) {
    return '';
  }

  const operand = node.params.children.reduce((acc, childNode) => {
    return `${acc} ${nodeToKueryExpression(childNode)}`;
  }, '').trim();

  if (node.negate) {
    return `-(${operand})`;
  }

  return operand;
}
