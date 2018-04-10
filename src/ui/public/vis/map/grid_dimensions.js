import _ from 'lodash';

// geohash precision mapping of geohash grid cell dimensions (width x height, in meters) at equator.
// https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator
const gridAtEquator = {
  '1': [5009400, 4992600],
  '2': [1252300, 624100],
  '3': [156500, 156000],
  '4': [39100, 19500],
  '5': [4900, 4900],
  '6': [1200, 609.4],
  '7': [152.9, 152.4],
  '8': [38.2, 19],
  '9': [4.8, 4.8],
  '10': [1.2, 0.595],
  '11': [0.149, 0.149],
  '12': [0.037, 0.019]
};

export function gridDimensions(precision) {
  return _.get(gridAtEquator, precision);
}
