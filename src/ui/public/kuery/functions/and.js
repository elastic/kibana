import * as ast from '../ast';
import { nodeTypes } from '../node_types';

export function buildNodeParams(children, serializeStyle = 'operator') {
  return {
    arguments: children,
    serializeStyle
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const children = node.arguments || [];

  return {
    bool: {
      filter: children.map((child) => {
        if (child.type === 'literal') {
          child = nodeTypes.function.buildNode('is', '*', child.value);
        }

        return ast.toElasticsearchQuery(child, indexPattern);
      })
    }
  };
}

export function toKueryExpression(node) {
  if (!['operator', 'implicit'].includes(node.serializeStyle)) {
    throw new Error(`Cannot serialize "and" function as "${node.serializeStyle}"`);
  }

  const queryStrings = (node.arguments || []).map((arg) => {
    const query = ast.toKueryExpression(arg);
    if (arg.type === 'function' && arg.function === 'or') {
      return `(${query})`;
    }
    return query;
  });

  if (node.serializeStyle === 'implicit') {
    return queryStrings.join(' ');
  }
  if (node.serializeStyle === 'operator') {
    return queryStrings.join(' and ');
  }
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
