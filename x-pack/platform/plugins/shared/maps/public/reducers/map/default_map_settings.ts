/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INITIAL_LOCATION, MAX_ZOOM, MIN_ZOOM } from '../../../common/constants';
import type { MapSettings } from '../../../common/descriptor_types';

export function getDefaultMapSettings(): MapSettings {
  return {
    auto_fit_to_data_bounds: false,
    background_color: 'transparent',
    custom_icons: [],
    disable_interactive: false,
    disable_tooltip_control: false,
    hide_toolbar_overlay: false,
    hide_layer_control: false,
    hide_view_control: false,
    initial_location: INITIAL_LOCATION.LAST_SAVED_LOCATION,
    fixed_location: { lat: 0, lon: 0, zoom: 2 },
    browser_location: { zoom: 2 },
    keydown_scroll_zoom: false,
    max_zoom: MAX_ZOOM,
    min_zoom: MIN_ZOOM,
    projection: 'globeInterpolate',
    show_scale_control: false,
    show_spatial_filters: true,
    show_timeslider_toggle_button: true,
    spatial_filters_alpa: 0.3,
    spatial_filters_fill_color: '#DA8B45',
    spatial_filters_line_color: '#DA8B45',
  };
}
