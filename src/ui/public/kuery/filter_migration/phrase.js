import { nodeTypes } from '../node_types';

export function convertPhraseFilter(filter) {
  if (filter.meta.type !== 'phrase') {
    throw new Error(`Expected filter of type "phrase", got "${filter.meta.type}"`);
  }

  const { key, params } = filter.meta;
  return nodeTypes.function.buildNode('is', key, params.query);
}
