/* eslint-disable */
define(function (require) {
  /*
   * Decodes geohash to object containing
   * top-left and bottom-right corners of
   * rectangle and center point.
   *
   * geohash.js
   * Geohash library for Javascript
   * (c) 2008 David Troy
   * Distributed under the MIT License
   *
   * @method refine_interval
   * @param interval {Array} [long, lat]
   * @param cd {Number}
   * @param mask {Number}
   * @return {Object} interval
   */
  function decodeGeoHash(geohash) {
    let BITS = [16, 8, 4, 2, 1];
    let BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let is_even = 1;
    let lat = [];
    let lon = [];
    lat[0] = -90.0;
    lat[1] = 90.0;
    lon[0] = -180.0;
    lon[1] = 180.0;
    let lat_err = 90.0;
    let lon_err = 180.0;
    for (let i = 0; i < geohash.length; i++) {
      let c = geohash[i];
      let cd = BASE32.indexOf(c);
      for (let j = 0; j < 5; j++) {
        let mask = BITS[j];
        if (is_even) {
          lon_err /= 2;
          refine_interval(lon, cd, mask);
        } else {
          lat_err /= 2;
          refine_interval(lat, cd, mask);
        }
        is_even = !is_even;
      }
    }
    lat[2] = (lat[0] + lat[1]) / 2;
    lon[2] = (lon[0] + lon[1]) / 2;
    return { latitude: lat, longitude: lon};
  }

  function refine_interval(interval, cd, mask) {
    if (cd & mask) {
      interval[0] = (interval[0] + interval[1]) / 2;
    } else {
      interval[1] = (interval[0] + interval[1]) / 2;
    }
  }

  return decodeGeoHash;
});
