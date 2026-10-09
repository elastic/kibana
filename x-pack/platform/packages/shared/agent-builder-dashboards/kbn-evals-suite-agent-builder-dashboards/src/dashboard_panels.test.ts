/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatDashboard,
  getControlFields,
  getPanelQueryKey,
  normalizeQuery,
  withoutKeyword,
} from './dashboard_panels';
import { control, dashboard } from './test_helpers';

describe('dashboard panels helpers', () => {
  it('reads every BY field of an ES|QL control query, without backticks', () => {
    expect(
      getControlFields({
        type: 'options_list_control',
        config: { esql_query: 'FROM logs | STATS BY `machine.os.keyword`, response' },
      })
    ).toEqual(['machine.os.keyword', 'response']);
  });

  it('reads the DSL field of a control without a query', () => {
    expect(
      getControlFields({ type: 'options_list_control', config: { field_name: 'host' } })
    ).toEqual(['host']);
    expect(getControlFields({ type: 'time_slider_control', config: {} })).toEqual([]);
  });

  it('keys panels by their normalized queries regardless of order and whitespace', () => {
    expect(getPanelQueryKey(['FROM a\n| STATS   COUNT(*)', 'FROM b'])).toEqual(
      getPanelQueryKey(['FROM b', 'FROM a | STATS COUNT(*)'])
    );
    expect(normalizeQuery('  FROM a\n|  STATS COUNT(*) ')).toBe('FROM a | STATS COUNT(*)');
  });

  it('strips only a trailing .keyword', () => {
    expect(withoutKeyword('host.keyword')).toBe('host');
    expect(withoutKeyword('keyword.field')).toBe('keyword.field');
    expect(withoutKeyword('bytes')).toBe('bytes');
  });

  it('lists the control fields in the compact rendering', () => {
    const rendered = formatDashboard(
      dashboard([], { pinned_panels: [control('response.keyword'), control('geo.src')] })
    );
    expect(rendered).toContain('controls: 2 (response.keyword, geo.src)');
  });
});
