/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Map saved objects persist layer and map state as camelCase JSON.
 * The content management API (and the descriptor types derived from its schemas) use snake_case.
 *
 * Conversion uses an explicit key map instead of a generic case conversion because
 * - snake_case -> camelCase is not reversible for keys such as `isLayerTOCOpen`
 * - unknown keys must be left untouched
 */
const CAMEL_TO_SNAKE: Record<string, string> = {
  allowHidden: 'allow_hidden',
  timeFieldName: 'time_field_name',
  adHocDataViews: 'ad_hoc_data_views',
  isLayerTOCOpen: 'is_layer_toc_open',
  openTOCDetails: 'open_toc_details',
  refreshInterval: 'refresh_interval',
  timeFilters: 'time_filters',
  symbolId: 'symbol_id',
  autoFitToDataBounds: 'auto_fit_to_data_bounds',
  backgroundColor: 'background_color',
  customIcons: 'custom_icons',
  disableInteractive: 'disable_interactive',
  disableTooltipControl: 'disable_tooltip_control',
  hideToolbarOverlay: 'hide_toolbar_overlay',
  hideLayerControl: 'hide_layer_control',
  hideViewControl: 'hide_view_control',
  initialLocation: 'initial_location',
  fixedLocation: 'fixed_location',
  browserLocation: 'browser_location',
  keydownScrollZoom: 'keydown_scroll_zoom',
  maxZoom: 'max_zoom',
  minZoom: 'min_zoom',
  showScaleControl: 'show_scale_control',
  showSpatialFilters: 'show_spatial_filters',
  showTimesliderToggleButton: 'show_timeslider_toggle_button',
  spatialFiltersAlpa: 'spatial_filters_alpa',
  spatialFiltersFillColor: 'spatial_filters_fill_color',
  spatialFiltersLineColor: 'spatial_filters_line_color',
  geoField: 'geo_field',
  requestType: 'request_type',
  groupByTimeseries: 'group_by_timeseries',
  lineSimplificationSize: 'line_simplification_size',
  splitField: 'split_field',
  sortField: 'sort_field',
  destGeoField: 'dest_geo_field',
  sourceGeoField: 'source_geo_field',
  tooltipProperties: 'tooltip_properties',
  isAutoSelect: 'is_auto_select',
  lightModeDefault: 'light_mode_default',
  serviceUrl: 'service_url',
  urlTemplate: 'url_template',
  layerName: 'layer_name',
  maxSourceZoom: 'max_source_zoom',
  minSourceZoom: 'min_source_zoom',
  applyForceRefresh: 'apply_force_refresh',
  applyGlobalQuery: 'apply_global_query',
  applyGlobalTime: 'apply_global_time',
  indexPatternId: 'index_pattern_id',
  filterByMapBounds: 'filter_by_map_bounds',
  scalingType: 'scaling_type',
  sortOrder: 'sort_order',
  topHitsGroupByTimeseries: 'top_hits_group_by_timeseries',
  topHitsSplitField: 'top_hits_split_field',
  topHitsSize: 'top_hits_size',
  dateField: 'date_field',
  narrowByMapBounds: 'narrow_by_map_bounds',
  whereQuery: 'where_query',
  isEnabled: 'is_enabled',
  colorRampName: 'color_ramp_name',
  iconPaletteId: 'icon_palette_id',
  customIconStops: 'custom_icon_stops',
  useCustomIconMap: 'use_custom_icon_map',
  fieldMetaOptions: 'field_meta_options',
  minSize: 'min_size',
  maxSize: 'max_size',
  isTimeAware: 'is_time_aware',
  customColorRamp: 'custom_color_ramp',
  useCustomColorRamp: 'use_custom_color_ramp',
  dataMappingFunction: 'data_mapping_function',
  colorCategory: 'color_category',
  customColorPalette: 'custom_color_palette',
  useCustomColorPalette: 'use_custom_color_palette',
  otherCategoryColor: 'other_category_color',
  useLayerZoomRange: 'use_layer_zoom_range',
  includeInFitToBounds: 'include_in_fit_to_bounds',
  areLabelsOnTop: 'are_labels_on_top',
  sourceDescriptor: 'source_descriptor',
  leftField: 'left_field',
  disableTooltips: 'disable_tooltips',
};

const SNAKE_TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([camel, snake]) => [snake, camel])
);

// Values under these keys are opaque to maps (ES queries, filters) or keyed by user provided names
const OPAQUE_KEYS = new Set(['filters', 'query', 'whereQuery', 'where_query', '__styleMeta']);

function convertKeys(value: unknown, keyMap: Record<string, string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, keyMap));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const converted: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, child]) => {
    converted[keyMap[key] ?? key] = OPAQUE_KEYS.has(key) ? child : convertKeys(child, keyMap);
  });
  return converted;
}

export function convertToSnakeCase<T>(value: unknown): T {
  return convertKeys(value, CAMEL_TO_SNAKE) as T;
}

export function convertToCamelCase<T>(value: unknown): T {
  return convertKeys(value, SNAKE_TO_CAMEL) as T;
}
