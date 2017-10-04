import { nodeTypes } from '../node_types';
import * as ast from '../ast';

export function buildNodeParams(fieldName, points) {
  const fieldNameArg = nodeTypes.literal.buildNode(fieldName);
  const args = points.map((point) => {
    const latLon = `${point.lat}, ${point.lon}`;
    return nodeTypes.literal.buildNode(latLon);
  });

  return {
    arguments: [fieldNameArg, ...args],
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const [ fieldNameArg, ...points ] = node.arguments;
  const fieldName = nodeTypes.literal.toElasticsearchQuery(fieldNameArg);
  const field = indexPattern.fields.byName[fieldName];
  const queryParams = {
    points: points.map(ast.toElasticsearchQuery)
  };

  if (field && field.scripted) {
    throw new Error(`Geo polygon query does not support scripted fields`);
  }

  return {
    geo_polygon: {
      [fieldName]: queryParams,
      ignore_unmapped: true,
    },
  };
}

export function getSuggestions(node, cursorPosition) {
  const childAtCursor = ast.getChildAtCursor(node, cursorPosition) || {};
  const { location, value = '' } = childAtCursor;

  const start = location ? location.min : cursorPosition;
  const end = location ? location.max : cursorPosition;

  const types = (node.arguments.length === 0 || node.arguments[0] === childAtCursor) ? ['field'] : [];
  const params = {
    query: value,
    types: ['geo_point']
  };

  return { start, end, types, params };
}
