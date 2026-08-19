/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { extractPanelQuery } from './panel_facts';

const grid = { x: 0, y: 0, w: 24, h: 10 };

describe('extractPanelQuery', () => {
  it('recovers the ES|QL query embedded in a generated Vega spec', () => {
    const query = 'FROM logs-* | STATS count = COUNT(*) BY service.name';
    const panel: AttachmentPanel = {
      id: 'vega-panel',
      type: VEGA_VIS_TYPE,
      grid,
      config: {
        spec: JSON.stringify({
          $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
          data: {
            url: {
              '%type%': 'esql',
              '%context%': true,
              query,
            },
          },
          mark: 'bar',
        }),
      },
    };

    expect(extractPanelQuery(panel)).toBe(query);
  });

  it('falls back to the legacy sibling query when the spec cannot be parsed', () => {
    const query = 'FROM logs-* | LIMIT 10';
    const panel: AttachmentPanel = {
      id: 'legacy-vega-panel',
      type: VEGA_VIS_TYPE,
      grid,
      config: {
        spec: 'not valid JSON',
        esqlQuery: query,
      },
    };

    expect(extractPanelQuery(panel)).toBe(query);
  });
});
