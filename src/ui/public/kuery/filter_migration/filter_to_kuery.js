import { nodeTypes } from '../node_types';
import { convertPhraseFilter } from './phrase';
import { convertRangeFilter } from './range';
import { convertExistsFilter } from './exists';
import { convertGeoBoundingBox } from './geo_bounding_box';
import { convertGeoPolygon } from './geo_polygon';

const conversionChain = [
  convertPhraseFilter,
  convertRangeFilter,
  convertExistsFilter,
  convertGeoBoundingBox,
  convertGeoPolygon,
];

export function filterToKueryAST(filter) {
  const { negate } = filter.meta;

  const node = conversionChain.reduce((acc, converter) => {
    if (acc !== null) return acc;

    try {
      return converter(filter);
    }
    catch (ex) {
      return null;
    }
  }, null);

  if (!node) {
    throw new Error(`Couldn't convert that filter to a kuery`);
  }

  return negate ? nodeTypes.function.buildNode('not', node) : node;
}
