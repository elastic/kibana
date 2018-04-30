import _ from 'lodash';

export function geoContains(collar, bounds) {
  //test if bounds top_left is outside collar
  if(bounds.top_left.lat > collar.top_left.lat || bounds.top_left.lon < collar.top_left.lon) {
    return false;
  }

  //test if bounds bottom_right is outside collar
  if(bounds.bottom_right.lat < collar.bottom_right.lat || bounds.bottom_right.lon > collar.bottom_right.lon) {
    return false;
  }

  //both corners are inside collar so collar contains bounds
  return true;
}

export function scaleBounds(bounds) {

  if (!bounds) {
    return;
  }

  bounds = normalizeLongitudes(bounds);

  const scale = .5; // scale bounds by 50%

  const topLeft = bounds.top_left;
  const bottomRight = bounds.bottom_right;


  let latDiff = _.round(Math.abs(topLeft.lat - bottomRight.lat), 5);
  const lonDiff = _.round(Math.abs(bottomRight.lon - topLeft.lon), 5);
  //map height can be zero when vis is first created
  if(latDiff === 0) latDiff = lonDiff;

  const latDelta = latDiff * scale;
  let topLeftLat = _.round(topLeft.lat, 5) + latDelta;
  if(topLeftLat > 90) topLeftLat = 90;
  let bottomRightLat = _.round(bottomRight.lat, 5) - latDelta;
  if(bottomRightLat < -90) bottomRightLat = -90;
  const lonDelta = lonDiff * scale;
  let topLeftLon = _.round(topLeft.lon, 5) - lonDelta;
  if(topLeftLon < -180) topLeftLon = -180;
  let bottomRightLon = _.round(bottomRight.lon, 5) + lonDelta;
  if(bottomRightLon > 180) bottomRightLon = 180;

  return {
    'top_left': { lat: topLeftLat, lon: topLeftLon },
    'bottom_right': { lat: bottomRightLat, lon: bottomRightLon }
  };
}

/**
 * Creates a bounds that does not wrap around the world over longitude
 * e.g. panning may cause the map to wrap to -400 longitude.
 *
 * @param bounds
 */
function normalizeLongitudes(bounds) {

  const width = bounds.bottom_right.lon - bounds.top_left.lon;
  let westLon;
  let eastLon;
  if (width > 360) {
    westLon = -180;
    eastLon = 180;
  } else {
    westLon = ((bounds.top_left.lon + 180) % 360) - 180;
    westLon = (westLon < -180) ? -180 : westLon;
    eastLon = westLon + width;
    eastLon = eastLon > 180 ? 180 : eastLon;
  }

  return {
    top_left: {
      lon: westLon,
      lat: bounds.top_left.lat
    },
    bottom_right: {
      lon: eastLon,
      lat: bounds.bottom_right.lat
    }
  };

}
