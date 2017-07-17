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

export function scaleBounds(bounds, scale) {
  if (!bounds) return;

  let safeScale = scale;
  if(safeScale < 1) scale = 1;
  if(safeScale > 5) scale = 5;
  safeScale = safeScale - 1;

  const topLeft = bounds.top_left;
  const bottomRight = bounds.bottom_right;
  let latDiff = _.round(Math.abs(topLeft.lat - bottomRight.lat), 5);
  const lonDiff = _.round(Math.abs(bottomRight.lon - topLeft.lon), 5);
  //map height can be zero when vis is first created
  if(latDiff === 0) latDiff = lonDiff;

  const latDelta = latDiff * safeScale;
  let topLeftLat = _.round(topLeft.lat, 5) + latDelta;
  if(topLeftLat > 90) topLeftLat = 90;
  let bottomRightLat = _.round(bottomRight.lat, 5) - latDelta;
  if(bottomRightLat < -90) bottomRightLat = -90;
  const lonDelta = lonDiff * safeScale;
  let topLeftLon = _.round(topLeft.lon, 5) - lonDelta;
  if(topLeftLon < -180) topLeftLon = -180;
  let bottomRightLon = _.round(bottomRight.lon, 5) + lonDelta;
  if(bottomRightLon > 180) bottomRightLon = 180;

  return {
    'top_left': { lat: topLeftLat, lon: topLeftLon },
    'bottom_right': { lat: bottomRightLat, lon: bottomRightLon }
  };
}
