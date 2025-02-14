/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file re-exports all parts of visualizations and datasources which can be loaded lazily
 * (to reduce page load bundle size) when Lens is actually accessed via editor or embeddable.
 *
 * It's also possible for each visualization and datasource to resolve this locally, but this causes
 * a burst of bundles being loaded on Lens startup at once (and in some scenarios cascading bundle loads).
 * This file causes all of them to be served in a single request.
 */

export * from './visualizations/datatable/datatable_visualization';
export * from './visualizations/datatable';
export * from './visualizations/legacy_metric/metric_visualization';
export * from './visualizations/legacy_metric';
export * from './visualizations/metric/metric_visualization';
export * from './visualizations/metric';
export * from './visualizations/partition/pie_visualization';
export * from './visualizations/partition';
export * from './visualizations/xy/xy_visualization';
export * from './visualizations/xy';
export * from './visualizations/heatmap/heatmap_visualization';
export * from './visualizations/heatmap';
export * from './visualizations/gauge/gauge_visualization';
export * from './visualizations/gauge';
export * from './visualizations/tagcloud/tagcloud_visualization';
export * from './visualizations/tagcloud';
export { getEditLensConfiguration } from './app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';

export * from './datasources/form_based/form_based';
export { getTextBasedDatasource } from './datasources/text_based/text_based_languages';
export { createFormulaPublicApi } from './datasources/form_based/operations/definitions/formula/formula_public_api';
export * from './lens_suggestions_api';

export * from './datasources/text_based';
export * from './datasources/form_based';
export * from './lens_ui_telemetry';
export * from './lens_ui_errors';
export * from './editor_frame_service/editor_frame';
export * from './editor_frame_service';
export * from './app_plugin/mounter';
export * from './lens_attribute_service';
export * from './app_plugin/save_modal_container';
export * from './chart_info_api';

export * from './trigger_actions/open_in_discover_helpers';
export * from './trigger_actions/open_lens_config/create_action_helpers';
export * from './trigger_actions/open_lens_config/in_app_embeddable_edit/in_app_embeddable_edit_action_helpers';
export { getAddLensPanelAction } from './trigger_actions/add_lens_panel_action';
export { AddESQLPanelAction } from './trigger_actions/open_lens_config/add_esql_panel_action';
