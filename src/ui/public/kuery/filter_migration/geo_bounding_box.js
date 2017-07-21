import _ from 'lodash';
import { nodeTypes } from '../node_types';

export function convertGeoBoundingBox(filter) {
  if (filter.meta.type !== 'geo_bounding_box') {
    throw new Error(`Expected filter of type "geo_bounding_box", got "${filter.meta.type}"`);
  }

  const { key, params } = filter.meta;
  const camelParams = _.mapKeys(params, (value, key) => _.camelCase(key));
  return nodeTypes.function.buildNode('geoBoundingBox', key, camelParams);
}
