/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_NEW_VIS_PANEL_GUIDANCE,
  NEVER_HAND_AUTHOR_VEGA_GUIDANCE,
  VEGA_SCOPE_AGENT_GUIDANCE,
  formatRawVegaAllowlist,
  formatRawVegaAllowlistCompact,
  formatRawVegaCatalogIds,
} from './agent_guidance';
import { RAW_VEGA_CATALOG_IDS } from './dialect';

describe('vega agent_guidance', () => {
  it('derives allowlist phrases from the Raw Vega catalog', () => {
    expect(formatRawVegaCatalogIds()).toBe(RAW_VEGA_CATALOG_IDS.join(', '));
    expect(formatRawVegaAllowlist()).toContain('sunburst / hierarchy');
    expect(formatRawVegaAllowlist()).toContain('radar / spider');
    expect(formatRawVegaAllowlist()).toContain('sankey / flow');
    expect(formatRawVegaAllowlistCompact()).toContain('sunburst/hierarchy');
  });

  it('exports shared guidance blocks used by skills and tools', () => {
    expect(VEGA_SCOPE_AGENT_GUIDANCE).toContain('allowlisted Raw Vega');
    expect(VEGA_SCOPE_AGENT_GUIDANCE).toContain('sunburst / hierarchy');
    expect(NEVER_HAND_AUTHOR_VEGA_GUIDANCE).toContain('hand-author');
    expect(DASHBOARD_NEW_VIS_PANEL_GUIDANCE).toContain('source: "request"');
    expect(DASHBOARD_NEW_VIS_PANEL_GUIDANCE).toContain('renderer: "vega"');
    expect(DASHBOARD_NEW_VIS_PANEL_GUIDANCE).toContain('create_visualization');
  });
});
