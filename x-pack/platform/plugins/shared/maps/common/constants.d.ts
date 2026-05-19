import type { FeatureCollection } from 'geojson';
export declare const MAP_SAVED_OBJECT_TYPE = "map";
export declare const APP_ID = "maps";
export declare const APP_ICON = "gisApp";
export declare const APP_ICON_SOLUTION = "logoKibana";
export declare const APP_NAME: string;
export declare const MAP_EMBEDDABLE_NAME: string;
export declare const INITIAL_LAYERS_KEY = "initialLayers";
export declare const MAPS_APP_PATH = "app/maps";
export declare const MAP_PATH = "map";
export declare const INDEX_SETTINGS_API_PATH = "/internal/maps/indexSettings";
export declare const FONTS_API_PATH = "/internal/maps/fonts";
export declare const INDEX_SOURCE_API_PATH = "/internal/maps/docSource";
export declare const INDEX_FEATURE_PATH = "/internal/maps/feature";
export declare const GET_MATCHING_INDEXES_PATH = "/internal/maps/getMatchingIndexes";
export declare const CHECK_IS_DRAWING_INDEX = "/internal/maps/checkIsDrawingIndex";
export declare const MVT_GETTILE_API_PATH = "/internal/maps/mvt/getTile";
export declare const MVT_GETGRIDTILE_API_PATH = "/internal/maps/mvt/getGridTile";
export declare const OPEN_LAYER_WIZARD = "openLayerWizard";
export declare const KBN_IS_CENTROID_FEATURE = "__kbn_is_centroid_feature__";
export declare const GEOJSON_FEATURE_ID_PROPERTY_NAME = "__kbn__feature_id__";
export declare function getNewMapPath(): string;
export declare function getFullPath(id: string | undefined): string;
export declare function getEditPath(id: string | undefined): string;
export declare enum LAYER_TYPE {
    RASTER_TILE = "RASTER_TILE",
    GEOJSON_VECTOR = "GEOJSON_VECTOR",
    EMS_VECTOR_TILE = "EMS_VECTOR_TILE",
    HEATMAP = "HEATMAP",
    BLENDED_VECTOR = "BLENDED_VECTOR",
    MVT_VECTOR = "MVT_VECTOR",
    LAYER_GROUP = "LAYER_GROUP"
}
export declare enum SOURCE_TYPES {
    EMS_TMS = "EMS_TMS",
    EMS_FILE = "EMS_FILE",
    ES_GEO_GRID = "ES_GEO_GRID",
    ES_GEO_LINE = "ES_GEO_LINE",
    ES_SEARCH = "ES_SEARCH",
    ES_PEW_PEW = "ES_PEW_PEW",
    ES_ML_ANOMALIES = "ML_ANOMALIES",
    ESQL = "ESQL",
    EMS_XYZ = "EMS_XYZ",// identifies a custom TMS source. EMS-prefix in the name is a little unfortunate :(
    WMS = "WMS",
    KIBANA_TILEMAP = "KIBANA_TILEMAP",
    GEOJSON_FILE = "GEOJSON_FILE",
    MVT_SINGLE_LAYER = "MVT_SINGLE_LAYER",
    ES_DISTANCE_SOURCE = "ES_DISTANCE_SOURCE",
    ES_TERM_SOURCE = "ES_TERM_SOURCE",
    TABLE_SOURCE = "TABLE_SOURCE"
}
export declare enum FIELD_ORIGIN {
    SOURCE = "source",
    JOIN = "join"
}
export declare const JOIN_FIELD_NAME_PREFIX = "__kbnjoin__";
export declare const META_DATA_REQUEST_ID_SUFFIX = "meta";
export declare const FORMATTERS_DATA_REQUEST_ID_SUFFIX = "formatters";
export declare const SOURCE_DATA_REQUEST_ID = "source";
export declare const SOURCE_META_DATA_REQUEST_ID = "source_meta";
export declare const SOURCE_FORMATTERS_DATA_REQUEST_ID = "source_formatters";
export declare const SOURCE_BOUNDS_DATA_REQUEST_ID = "source_bounds";
export declare const MIN_ZOOM = 0;
export declare const MAX_ZOOM = 24;
export declare const DECIMAL_DEGREES_PRECISION = 5;
export declare const ZOOM_PRECISION = 2;
export declare const DEFAULT_MAX_RESULT_WINDOW = 10000;
export declare const DEFAULT_MAX_INNER_RESULT_WINDOW = 100;
export declare const DEFAULT_MAX_BUCKETS_LIMIT = 65535;
export declare const FEATURE_VISIBLE_PROPERTY_NAME = "__kbn_isvisibleduetojoin__";
export declare const MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER = "_";
export declare enum ES_GEO_FIELD_TYPE {
    GEO_POINT = "geo_point",
    GEO_SHAPE = "geo_shape"
}
export declare const ES_GEO_FIELD_TYPES: string[];
export declare enum GEO_JSON_TYPE {
    POINT = "Point",
    MULTI_POINT = "MultiPoint",
    LINE_STRING = "LineString",
    MULTI_LINE_STRING = "MultiLineString",
    POLYGON = "Polygon",
    MULTI_POLYGON = "MultiPolygon",
    GEOMETRY_COLLECTION = "GeometryCollection"
}
export declare const POLYGON_COORDINATES_EXTERIOR_INDEX = 0;
export declare const LON_INDEX = 0;
export declare const LAT_INDEX = 1;
export declare const EMPTY_FEATURE_COLLECTION: FeatureCollection;
export declare enum DRAW_MODE {
    DRAW_SHAPES = "DRAW_SHAPES",
    DRAW_POINTS = "DRAW_POINTS",
    DRAW_FILTERS = "DRAW_FILTERS",
    NONE = "NONE"
}
export declare enum DRAW_SHAPE {
    BOUNDS = "BOUNDS",
    DISTANCE = "DISTANCE",
    POLYGON = "POLYGON",
    POINT = "POINT",
    LINE = "LINE",
    SIMPLE_SELECT = "SIMPLE_SELECT",
    DELETE = "DELETE",
    WAIT = "WAIT"
}
export declare const AGG_DELIMITER = "_of_";
export declare enum AGG_TYPE {
    AVG = "avg",
    COUNT = "count",
    MAX = "max",
    MIN = "min",
    SUM = "sum",
    TERMS = "terms",
    PERCENTILE = "percentile",
    UNIQUE_COUNT = "cardinality"
}
export declare enum RENDER_AS {
    HEATMAP = "heatmap",
    POINT = "point",
    GRID = "grid",
    HEX = "hex"
}
export declare enum GRID_RESOLUTION {
    COARSE = "COARSE",
    FINE = "FINE",
    MOST_FINE = "MOST_FINE",
    SUPER_FINE = "SUPER_FINE"
}
export declare const GEOTILE_GRID_AGG_NAME = "gridSplit";
export declare const GEOCENTROID_AGG_NAME = "gridCentroid";
export declare const TOP_TERM_PERCENTAGE_SUFFIX = "__percentage";
export declare const DEFAULT_PERCENTILE = 50;
export declare const COUNT_PROP_NAME = "doc_count";
export declare enum STYLE_TYPE {
    STATIC = "STATIC",
    DYNAMIC = "DYNAMIC"
}
export declare enum LAYER_STYLE_TYPE {
    VECTOR = "VECTOR",
    HEATMAP = "HEATMAP",
    TILE = "TILE",
    EMS_VECTOR_TILE = "EMS_VECTOR_TILE"
}
export declare enum COLOR_MAP_TYPE {
    CATEGORICAL = "CATEGORICAL",
    ORDINAL = "ORDINAL"
}
export declare const CATEGORICAL_DATA_TYPES: string[];
export declare const ORDINAL_DATA_TYPES: string[];
export declare enum SYMBOLIZE_AS_TYPES {
    CIRCLE = "circle",
    ICON = "icon"
}
export declare enum LABEL_BORDER_SIZES {
    NONE = "NONE",
    SMALL = "SMALL",
    MEDIUM = "MEDIUM",
    LARGE = "LARGE"
}
export declare enum LABEL_POSITIONS {
    BOTTOM = "BOTTOM",
    CENTER = "CENTER",
    TOP = "TOP"
}
export declare const DEFAULT_ICON = "marker";
export declare const DEFAULT_CUSTOM_ICON_CUTOFF = 0.25;
export declare const DEFAULT_CUSTOM_ICON_RADIUS = 0.25;
export declare const CUSTOM_ICON_SIZE = 64;
export declare const CUSTOM_ICON_PREFIX_SDF = "__kbn__custom_icon_sdf__";
export declare const MAKI_ICON_SIZE = 16;
export declare const HALF_MAKI_ICON_SIZE: number;
export declare enum ICON_SOURCE {
    CUSTOM = "CUSTOM",
    MAKI = "MAKI"
}
export declare enum VECTOR_STYLES {
    SYMBOLIZE_AS = "symbolizeAs",
    FILL_COLOR = "fillColor",
    LINE_COLOR = "lineColor",
    LINE_WIDTH = "lineWidth",
    ICON = "icon",
    ICON_SIZE = "iconSize",
    ICON_ORIENTATION = "iconOrientation",
    LABEL_TEXT = "labelText",
    LABEL_ZOOM_RANGE = "labelZoomRange",
    LABEL_COLOR = "labelColor",
    LABEL_SIZE = "labelSize",
    LABEL_BORDER_COLOR = "labelBorderColor",
    LABEL_BORDER_SIZE = "labelBorderSize",
    LABEL_POSITION = "labelPosition"
}
export declare enum SCALING_TYPES {
    LIMIT = "LIMIT",
    CLUSTERS = "CLUSTERS",
    TOP_HITS = "TOP_HITS",
    MVT = "MVT"
}
export declare enum MVT_FIELD_TYPE {
    STRING = "String",
    NUMBER = "Number"
}
export declare const SPATIAL_FILTERS_LAYER_ID = "SPATIAL_FILTERS_LAYER_ID";
export declare enum INITIAL_LOCATION {
    LAST_SAVED_LOCATION = "LAST_SAVED_LOCATION",
    FIXED_LOCATION = "FIXED_LOCATION",
    BROWSER_LOCATION = "BROWSER_LOCATION",
    AUTO_FIT_TO_BOUNDS = "AUTO_FIT_TO_BOUNDS"
}
export declare enum LAYER_WIZARD_CATEGORY {
    ELASTICSEARCH = "ELASTICSEARCH",
    REFERENCE = "REFERENCE",
    SOLUTIONS = "SOLUTIONS"
}
export declare enum VECTOR_SHAPE_TYPE {
    POINT = "POINT",
    LINE = "LINE",
    POLYGON = "POLYGON"
}
export declare enum MB_LOOKUP_FUNCTION {
    GET = "get",
    FEATURE_STATE = "feature-state"
}
export declare enum DATA_MAPPING_FUNCTION {
    INTERPOLATE = "INTERPOLATE",
    PERCENTILES = "PERCENTILES"
}
export declare const DEFAULT_PERCENTILES: number[];
export type RawValue = string | string[] | number | boolean | undefined | null;
export type FieldFormatter = (value: RawValue) => string | number;
export declare const MAPS_NEW_VECTOR_LAYER_META_CREATED_BY = "maps-new-vector-layer";
export declare const MAX_DRAWING_SIZE_BYTES = 10485760;
export declare const NO_EMS_LOCALE = "none";
export declare const AUTOSELECT_EMS_LOCALE = "autoselect";
export declare const emsWorldLayerId = "world_countries";
export declare enum WIZARD_ID {
    CHOROPLETH = "choropleth",
    GEO_FILE = "uploadGeoFile",
    LAYER_GROUP = "layerGroup",
    NEW_VECTOR = "newVectorLayer",
    OBSERVABILITY = "observabilityLayer",
    SECURITY = "securityLayer",
    EMS_BOUNDARIES = "emsBoundaries",
    EMS_BASEMAP = "emsBaseMap",
    CLUSTERS = "clusters",
    HEATMAP = "heatmap",
    GEO_LINE = "geoLine",
    POINT_2_POINT = "point2Point",
    ES_DOCUMENT = "esDocument",
    ES_TOP_HITS = "esTopHits",
    ESQL = "ESQL",
    KIBANA_BASEMAP = "kibanaBasemap",
    MVT_VECTOR = "mvtVector",
    WMS_LAYER = "wmsLayer",
    TMS_LAYER = "tmsLayer",
    SPATIAL_JOIN = "spatialJoin"
}
export declare enum MASK_OPERATOR {
    ABOVE = "ABOVE",
    BELOW = "BELOW"
}
export declare const RENDER_TIMEOUT = 1000;
export declare const MIDDLE_TRUNCATION_PROPS: {
    truncation: "middle";
};
export declare const SINGLE_SELECTION_AS_TEXT_PROPS: {
    asPlainText: boolean;
};
