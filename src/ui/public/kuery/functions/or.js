import * as ast from '../ast';

export function buildNodeParams(children) {
  return {
    arguments: children,
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const children = node.arguments || [];

  return {
    bool: {
      should: children.map((child) => {
        return ast.toElasticsearchQuery(child, indexPattern);
      }),
      minimum_should_match: 1,
    },
  };
}
