import * as ast from '../ast';
import { nodeTypes } from '../node_types';

export function buildNodeParams(children, serializeStyle = 'operator') {
  return {
    arguments: children,
    serializeStyle,
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const children = node.arguments || [];

  return {
    bool: {
      should: children.map((child) => {
        if (child.type === 'literal') {
          child = nodeTypes.function.buildNode('is', '*', child.value);
        }

        return ast.toElasticsearchQuery(child, indexPattern);
      }),
      minimum_should_match: 1,
    },
  };
}

export function toKueryExpression(node) {
  if (node.serializeStyle !== 'operator') {
    throw new Error(`Cannot serialize "or" function as "${node.serializeStyle}"`);
  }

  const queryStrings = (node.arguments || []).map((arg) => {
    return ast.toKueryExpression(arg);
  });

  return queryStrings.join(' or ');
}

export function getSuggestions(node, cursorPosition) {
  const childAtCursor = ast.getChildAtCursor(node, cursorPosition) || {};
  const { type, location, value = '' } = childAtCursor;
  if (type && type !== 'literal') {
    return ast.getSuggestions(childAtCursor, cursorPosition);
  }

  const start = location ? location.min : cursorPosition;
  const end = location ? location.max : cursorPosition;
  const types = ['function', 'field'];
  const params = value;

  return { start, end, types, params };
}
