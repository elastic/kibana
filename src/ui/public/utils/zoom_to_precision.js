import {geohashColumns} from 'ui/utils/decode_geo_hash';

const maxPrecision = 12;
/**
 * Map Leaflet zoom levels to geohash precision levels.
 * The size of a geohash column-width on the map should be at least `minGeohashPixels` pixels wide.
 */
const zoomPrecision = {};
const minGeohashPixels = 16;
for (let zoom = 0; zoom <= 21; zoom += 1) {
  const worldPixels = 256 * Math.pow(2, zoom);
  zoomPrecision[zoom] = 1;
  for (let precision = 2; precision <= maxPrecision; precision += 1) {
    const columns = geohashColumns(precision);
    if ((worldPixels / columns) >= minGeohashPixels) {
      zoomPrecision[zoom] = precision;
    } else {
      break;
    }
  }
}


export default function zoomToPrecision(mapZoom, maxPrecision) {
  return Math.min(zoomPrecision[mapZoom], maxPrecision);
};
