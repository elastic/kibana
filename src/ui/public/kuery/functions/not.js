import * as ast from '../ast';
import { nodeTypes } from '../node_types';

export function buildNodeParams(child, serializeStyle = 'operator') {
  return {
    arguments: [child],
    serializeStyle
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  let [ argument ] = node.arguments;
  if (argument.type === 'literal') {
    argument = nodeTypes.function.buildNode('is', null, argument.value);
  }

  return {
    bool: {
      must_not: ast.toElasticsearchQuery(argument, indexPattern)
    }
  };
}

export function toKueryExpression(node) {
  if (node.serializeStyle !== 'operator') {
    throw new Error(`Cannot serialize "not" function as "${node.serializeStyle}"`);
  }

  const [ argument ] = node.arguments;
  const queryString = ast.toKueryExpression(argument);

  if (
    argument.function &&
    (argument.function === 'and' || argument.function === 'or') &&
    argument.serializeStyle !== 'function'
  ) {
    return `!(${queryString})`;
  }
  else {
    return `!${queryString}`;
  }
}
