/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateDiscoverBundlePluginAssertion } from './discover_bundle_expectations';

describe('evaluateDiscoverBundlePluginAssertion', () => {
  const expectedPlugins = [
    'aiops',
    'discover',
    'embeddable',
    'eventAnnotation',
    'expressionXY',
    'kbn-ui-shared-deps-npm',
    'kql',
    'lens',
    'maps',
    'unifiedSearch',
  ];
  const sharedBundleLabels = ['core', 'rspack-chunk', 'shared-packages'];

  test('accepts source-path chunks for expected plugins and shared packages', () => {
    expect(
      evaluateDiscoverBundlePluginAssertion(
        [
          'kbn-ui-shared-deps-npm',
          'src_platform_packages_shared_kbn-field-utils_src_components_field_icon_field_icon_tsx',
          'src_platform_plugins_private_event_annotation_public_event_annotation_service_service_tsx',
          'src_platform_plugins_shared_chart_expressions_expression_xy_public_helpers_index_ts',
          'src_platform_plugins_shared_discover_public_application_index_tsx',
          'src_platform_plugins_shared_unified_search_public_ui_module_ts',
          'x-pack_platform_plugins_shared_aiops_public_components_log_categorization_log_categorization_-fb32e5',
          'x-pack_platform_plugins_shared_lens_public_async_services_ts',
          'x-pack_platform_plugins_shared_maps_public_lens_choropleth_chart_visualization_tsx',
        ],
        expectedPlugins,
        sharedBundleLabels
      )
    ).toStrictEqual({ ok: true });
  });

  test('rejects unexpected source-path plugin chunks', () => {
    expect(
      evaluateDiscoverBundlePluginAssertion(
        ['src_platform_plugins_shared_dashboard_public_plugin_ts'],
        expectedPlugins,
        sharedBundleLabels
      )
    ).toStrictEqual({
      ok: false,
      detail:
        'Unexpected labels found. Loaded=["src_platform_plugins_shared_dashboard_public_plugin_ts"], allowed=["aiops","discover","embeddable","eventAnnotation","expressionXY","kbn-ui-shared-deps-npm","kql","lens","maps","unifiedSearch","core","rspack-chunk","shared-packages"]',
    });
  });
});
