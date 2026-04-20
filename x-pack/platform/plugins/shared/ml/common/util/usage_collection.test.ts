/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCustomRuleEditorOpenedEventName } from './usage_collection';

describe('usage_collection utils', () => {
  test('getCustomRuleEditorOpenedEventName resolves event name from source', () => {
    expect(getCustomRuleEditorOpenedEventName('explorer_anomalies_table')).toBe(
      'custom_rule_editor_opened_explorer_anomalies_table'
    );
    expect(getCustomRuleEditorOpenedEventName('single_metric_viewer_chart')).toBe(
      'custom_rule_editor_opened_single_metric_viewer_chart'
    );
  });
});
