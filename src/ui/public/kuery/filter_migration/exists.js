import { nodeTypes } from '../node_types';

export function convertExistsFilter(filter) {
  if (filter.meta.type !== 'exists') {
    throw new Error(`Expected filter of type "exists", got "${filter.meta.type}"`);
  }

  const { key } = filter.meta;
  return nodeTypes.function.buildNode('exists', key);
}
