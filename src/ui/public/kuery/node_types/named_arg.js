import _ from 'lodash';
import * as ast from '../ast';
import { nodeTypes } from '../node_types';

export function buildNode(name, value) {
  const argumentNode = (_.get(value, 'type') === 'literal') ? value : nodeTypes.literal.buildNode(value);
  return {
    type: 'namedArg',
    name,
    value: argumentNode,
  };
}

export function toElasticsearchQuery(node) {
  return ast.toElasticsearchQuery(node.value);
}

