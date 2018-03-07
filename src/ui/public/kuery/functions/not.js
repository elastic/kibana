import * as ast from '../ast';

export function buildNodeParams(child) {
  return {
    arguments: [child],
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const [ argument ] = node.arguments;

  return {
    bool: {
      must_not: ast.toElasticsearchQuery(argument, indexPattern)
    }
  };
}

