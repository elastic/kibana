import { nodeTypes } from '../node_types';

export function convertRangeFilter(filter) {
  if (filter.meta.type !== 'range') {
    throw new Error(`Expected filter of type "range", got "${filter.meta.type}"`);
  }

  const { key, params } = filter.meta;
  return nodeTypes.function.buildNode('range', key, params);
}
