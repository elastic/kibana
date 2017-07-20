import { geohashColumns } from 'ui/utils/decode_geo_hash';

const maxPrecision = 12;
/**
 * Map Leaflet zoom levels to geohash precision levels.
 * The size of a geohash column-width on the map should be at least `minGeohashPixels` pixels wide.
 */




const zoomPrecisionMap = {};
const minGeohashPixels = 16;

function calculateZoomToPrecisionMap(maxZoom) {

  for (let zoom = 0; zoom <= maxZoom; zoom += 1) {
    if (typeof zoomPrecisionMap[zoom] === 'number') {
      continue;
    }
    const worldPixels = 256 * Math.pow(2, zoom);
    zoomPrecisionMap[zoom] = 1;
    for (let precision = 2; precision <= maxPrecision; precision += 1) {
      const columns = geohashColumns(precision);
      if ((worldPixels / columns) >= minGeohashPixels) {
        zoomPrecisionMap[zoom] = precision;
      } else {
        break;
      }
    }
  }
}


export function zoomToPrecision(mapZoom, maxPrecision, maxZoom) {
  calculateZoomToPrecisionMap(typeof maxZoom === 'number' ? maxZoom : 21);
  return Math.min(zoomPrecisionMap[mapZoom], maxPrecision);
}
