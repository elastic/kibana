import _ from 'lodash';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';

export function buildNodeParams(fieldName, params) {
  params = _.pick(params, 'topLeft', 'bottomRight');
  const fieldNameArg = nodeTypes.literal.buildNode(fieldName);
  const args = _.map(params, (value, key) => {
    const latLon = `${value.lat}, ${value.lon}`;
    return nodeTypes.namedArg.buildNode(key, latLon);
  });

  return {
    arguments: [fieldNameArg, ...args],
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const [ fieldNameArg, ...args ] = node.arguments;
  const fieldName = nodeTypes.literal.toElasticsearchQuery(fieldNameArg);
  const field = indexPattern.fields.byName[fieldName];
  const queryParams = args.reduce((acc, arg) => {
    const snakeArgName = _.snakeCase(arg.name);
    return {
      ...acc,
      [snakeArgName]: ast.toElasticsearchQuery(arg),
    };
  }, {});

  if (field && field.scripted) {
    throw new Error(`Geo bounding box query does not support scripted fields`);
  }

  return {
    geo_bounding_box: {
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

  const [ fieldNameArg, ...args ] = node.arguments;
  const namedArgs = _.compact(args.map(arg => arg.name));
  const remainingArgs = _.difference(['topLeft', 'bottomRight'], namedArgs);

  let types;
  let params;
  if (node.arguments.length === 0 || fieldNameArg === childAtCursor) {
    types = ['field'];
    params = {
      query: value,
      types: ['geo_point']
    };
  } else {
    types = ['argument'];
    params = {
      query: value,
      argNames: remainingArgs
    };
  }

  return { start, end, types, params };
}
