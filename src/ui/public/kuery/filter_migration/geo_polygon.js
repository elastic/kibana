import { nodeTypes } from '../node_types';

export function convertGeoPolygon(filter) {
  if (filter.meta.type !== 'geo_polygon') {
    throw new Error(`Expected filter of type "geo_polygon", got "${filter.meta.type}"`);
  }

  const { key, params: { points } } = filter.meta;
  return nodeTypes.function.buildNode('geoPolygon', key, points);
}
