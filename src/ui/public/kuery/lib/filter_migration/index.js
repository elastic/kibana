import _ from 'lodash';
import { nodeTypes } from '../node_types';

export function filterToKueryAST(filter) {
  const ast = convertMatchFilter(filter)
    || convertRangeFilter(filter);

  if (!ast) {
    throw new Error(`Couldn't convert that filter to a kuery`);
  }

  return ast;
}

function convertMatchFilter(filter) {
  if (!filter.query || !filter.query.match) return;

  const key = _.keys(filter.query.match)[0];
  const value = filter.query.match[key].query;
  const operation = _.get(filter, 'meta.negate') ? '-' : '+';
  return nodeTypes.match.buildNode({ field: key, values: value, operation });
}

function convertRangeFilter(filter) {
  if (!filter.range) return;

  const key = _.keys(filter.range)[0];
  const params = filter.range[key];
  const operation = _.get(filter, 'meta.negate') ? '-' : '+';
  const nodeParams = {
    gt: _.has(params, 'gte') ? params.gte : params.gt,
    lt: _.has(params, 'lte') ? params.lte : params.lt
  };

  return nodeTypes.range.buildNode({ field: key, params: nodeParams, operation });
}
