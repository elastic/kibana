/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const EMS_CATALOGUE_PATH = 'ems/catalogue';

export const EMS_FILES_CATALOGUE_PATH = 'ems/files';
export const EMS_FILES_DEFAULT_JSON_PATH = 'ems/files/file';
export const EMS_GLYPHS_PATH = 'ems/fonts';
export const EMS_SPRITES_PATH = 'ems/sprites';

export const EMS_TILES_CATALOGUE_PATH = 'ems/tiles';
export const EMS_TILES_RASTER_STYLE_PATH = 'ems/tiles/raster/style';
export const EMS_TILES_RASTER_TILE_PATH = 'ems/tiles/raster/tile';

export const EMS_TILES_VECTOR_STYLE_PATH = 'ems/tiles/vector/style';
export const EMS_TILES_VECTOR_SOURCE_PATH = 'ems/tiles/vector/source';
export const EMS_TILES_VECTOR_TILE_PATH = 'ems/tiles/vector/tile';

export const MAP_SAVED_OBJECT_TYPE = 'map';
export const APP_ID = 'maps';
export const APP_ICON = 'gisApp';

export const MAP_APP_PATH = `app/${APP_ID}`;
export const GIS_API_PATH = `api/${APP_ID}`;

export const MAP_BASE_URL = `/${MAP_APP_PATH}#/${MAP_SAVED_OBJECT_TYPE}`;

export function createMapPath(id) {
  return `${MAP_BASE_URL}/${id}`;
}

export const LAYER_TYPE = {
  TILE: 'TILE',
  VECTOR: 'VECTOR',
  VECTOR_TILE: 'VECTOR_TILE',
  HEATMAP: 'HEATMAP'
};

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
};

export const EMS_TMS = 'EMS_TMS';
export const EMS_FILE = 'EMS_FILE';
export const ES_GEO_GRID = 'ES_GEO_GRID';
export const ES_SEARCH = 'ES_SEARCH';
export const ES_PEW_PEW = 'ES_PEW_PEW';

export const FIELD_ORIGIN = {
  SOURCE: 'source',
  JOIN: 'join'
};

export const SOURCE_DATA_ID_ORIGIN = 'source';
export const META_ID_ORIGIN_SUFFIX = 'meta';
export const SOURCE_META_ID_ORIGIN = `${SOURCE_DATA_ID_ORIGIN}_${META_ID_ORIGIN_SUFFIX}`;

export const GEOJSON_FILE = 'GEOJSON_FILE';

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 24;

export const DECIMAL_DEGREES_PRECISION = 5; // meters precision
export const ZOOM_PRECISION = 2;
export const ES_SIZE_LIMIT = 10000;

export const FEATURE_ID_PROPERTY_NAME = '__kbn__feature_id__';
export const FEATURE_VISIBLE_PROPERTY_NAME = '__kbn_isvisibleduetojoin__';

export const MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER = '_';

export const ES_GEO_FIELD_TYPE = {
  GEO_POINT: 'geo_point',
  GEO_SHAPE: 'geo_shape'
};

export const ES_SPATIAL_RELATIONS = {
  INTERSECTS: 'INTERSECTS',
  DISJOINT: 'DISJOINT',
  WITHIN: 'WITHIN',
};

export const GEO_JSON_TYPE = {
  POINT: 'Point',
  MULTI_POINT: 'MultiPoint',
  LINE_STRING: 'LineString',
  MULTI_LINE_STRING: 'MultiLineString',
  POLYGON: 'Polygon',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
};

export const POLYGON_COORDINATES_EXTERIOR_INDEX = 0;
export const LON_INDEX = 0;
export const LAT_INDEX = 1;

export const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: []
};

export const DRAW_TYPE = {
  BOUNDS: 'BOUNDS',
  POLYGON: 'POLYGON'
};

export const METRIC_TYPE = {
  AVG: 'avg',
  COUNT: 'count',
  MAX: 'max',
  MIN: 'min',
  SUM: 'sum',
  UNIQUE_COUNT: 'cardinality',
};

export const COUNT_AGG_TYPE = METRIC_TYPE.COUNT;
export const COUNT_PROP_LABEL =  i18n.translate('xpack.maps.aggs.defaultCountLabel', {
  defaultMessage: 'count'
});

export const COUNT_PROP_NAME = 'doc_count';

export const STYLE_TYPE = {
  STATIC: 'STATIC',
  DYNAMIC: 'DYNAMIC'
};

export const LAYER_STYLE_TYPE = {
  VECTOR: 'VECTOR',
  HEATMAP: 'HEATMAP'
};
