/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import {
  OPAQUE_PANEL_LIMITS,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { findByRefPanels, summarizeSavedObject } from './by_ref_panels';

const grid = { x: 0, y: 0, w: 24, h: 10 };

const savedObject = (
  type: string,
  attributes: Record<string, unknown>,
  references: SavedObject['references'] = []
): SavedObject => ({ id: `${type}-id`, type, attributes, references });

const dataViewTitles = new Map([['logs-data-view', 'kibana_sample_data_logs']]);

const dataViewReference = { name: 'ref', type: 'index-pattern', id: 'logs-data-view' };

describe('findByRefPanels', () => {
  it('finds panels that only reference a saved object, inside and outside sections', () => {
    const dashboard: DashboardAttachmentData = {
      title: 'Web traffic',
      panels: [
        { type: 'legacy_vis', id: 'vega', config: { savedObjectId: 'vis-1' }, grid },
        { type: 'vis', id: 'by-value', config: { data_source: { type: 'esql' } }, grid },
        {
          id: 'section',
          title: 'Section',
          collapsed: false,
          grid: { y: 1 },
          panels: [
            { type: 'map', id: 'map', config: { savedObjectId: 'map-1' }, grid },
            { type: 'vis', id: 'lens', config: { ref_id: 'lens-1' }, grid },
            { type: 'discover_session', id: 'search', config: { ref_id: 'search-1' }, grid },
          ],
        },
      ],
    };

    expect(findByRefPanels(dashboard)).toEqual([
      {
        panelId: 'vega',
        panelType: 'legacy_vis',
        savedObjectType: 'visualization',
        savedObjectId: 'vis-1',
      },
      { panelId: 'map', panelType: 'map', savedObjectType: 'map', savedObjectId: 'map-1' },
      { panelId: 'lens', panelType: 'vis', savedObjectType: 'lens', savedObjectId: 'lens-1' },
      {
        panelId: 'search',
        panelType: 'discover_session',
        savedObjectType: 'search',
        savedObjectId: 'search-1',
      },
    ]);
  });

  it('ignores saved object ids on panel types it cannot read', () => {
    const dashboard: DashboardAttachmentData = {
      title: 'Other',
      panels: [{ type: 'links', id: 'links', config: { savedObjectId: 'links-1' }, grid }],
    };

    expect(findByRefPanels(dashboard)).toEqual([]);
  });
});

describe('summarizeSavedObject', () => {
  it('summarizes a visualization by its title, type, data view, and query', () => {
    const pie = savedObject(
      'visualization',
      {
        title: 'Visitors by OS',
        visState: JSON.stringify({ type: 'pie', aggs: [] }),
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"query":{"query":"response:200","language":"kuery"},"filter":[]}',
        },
      },
      [dataViewReference]
    );

    expect(summarizeSavedObject(pie, dataViewTitles)).toEqual({
      title: 'Visitors by OS',
      chart_type: 'pie',
      data_views: ['kibana_sample_data_logs'],
      query: 'response:200',
    });
  });

  it('summarizes a Vega visualization without a query by its title and type', () => {
    const vega = savedObject('visualization', {
      title: '[Logs] Unique Destination Heatmap',
      visState: JSON.stringify({ type: 'vega', params: { spec: '{}' } }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    });

    expect(summarizeSavedObject(vega, dataViewTitles)).toEqual({
      title: '[Logs] Unique Destination Heatmap',
      chart_type: 'vega',
    });
  });

  it('summarizes a map by its title and data view', () => {
    const map = savedObject(
      'map',
      { title: '[Logs] Total Requests and Bytes', layerListJSON: '[]' },
      [dataViewReference]
    );

    expect(summarizeSavedObject(map, dataViewTitles)).toEqual({
      title: '[Logs] Total Requests and Bytes',
      chart_type: 'map',
      data_views: ['kibana_sample_data_logs'],
    });
  });

  it('summarizes a Lens visualization by its ES|QL query', () => {
    const esql = 'FROM logs | STATS COUNT(*) BY BUCKET(@timestamp, 1 hour)';
    const lens = savedObject('lens', {
      title: 'Requests',
      visualizationType: 'lnsXY',
      state: { query: { esql } },
    });

    expect(summarizeSavedObject(lens, dataViewTitles)).toEqual({
      title: 'Requests',
      chart_type: 'lnsXY',
      query: esql,
    });
  });

  it('summarizes a form-based Lens visualization by its KQL query and data view', () => {
    const lens = savedObject(
      'lens',
      {
        title: 'Bytes by extension',
        visualizationType: 'lnsDatatable',
        state: { query: { query: 'extension:css', language: 'kuery' } },
      },
      [dataViewReference]
    );

    expect(summarizeSavedObject(lens, dataViewTitles)).toEqual({
      title: 'Bytes by extension',
      chart_type: 'lnsDatatable',
      data_views: ['kibana_sample_data_logs'],
      query: 'extension:css',
    });
  });

  it('summarizes a Discover session by the query of its first tab', () => {
    const search = savedObject('search', {
      title: 'Errors',
      tabs: [
        {
          attributes: {
            kibanaSavedObjectMeta: {
              searchSourceJSON: '{"query":{"esql":"FROM logs | WHERE response >= 500"}}',
            },
          },
        },
      ],
    });

    expect(summarizeSavedObject(search, dataViewTitles)).toEqual({
      title: 'Errors',
      chart_type: 'search',
      query: 'FROM logs | WHERE response >= 500',
    });
  });

  it('caps the title and query at the text limit', () => {
    const lens = savedObject('lens', {
      title: 't'.repeat(10000),
      state: { query: { esql: 'q'.repeat(10000) } },
    });

    const { title, query } = summarizeSavedObject(lens, dataViewTitles);

    expect(title).toHaveLength(OPAQUE_PANEL_LIMITS.textLength);
    expect(query).toHaveLength(OPAQUE_PANEL_LIMITS.textLength);
  });
});
