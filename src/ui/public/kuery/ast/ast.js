import _ from 'lodash';
import { nodeTypes } from '../node_types/index';
import * as errors from '../errors';
import { parse as parseKuery } from './kuery';
import { parse as parseLegacyKuery } from './legacy_kuery';

export function fromLiteralExpression(expression, parseOptions) {
  parseOptions = {
    ...parseOptions,
    startRule: 'Literal',
  };

  return fromExpression(expression, parseOptions, parseKuery);
}

export function fromLegacyKueryExpression(expression, parseOptions) {
  return fromExpression(expression, parseOptions, parseLegacyKuery);
}

export function fromKueryExpression(expression, parseOptions) {
  return fromExpression(expression, parseOptions, parseKuery);
}

function fromExpression(expression, parseOptions = {}, parse = parseKuery) {
  if (_.isUndefined(expression)) {
    throw new Error('expression must be a string, got undefined instead');
  }

  parseOptions = {
    ...parseOptions,
    helpers: { nodeTypes, errors }
  };

  return parse(expression, parseOptions);
}

export function toElasticsearchQuery(node, indexPattern) {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', []));
  }

  return nodeTypes[node.type].toElasticsearchQuery(node, indexPattern);
}
