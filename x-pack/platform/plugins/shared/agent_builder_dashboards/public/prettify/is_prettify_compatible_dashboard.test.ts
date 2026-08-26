/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/common';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { isPrettifyCompatibleDashboard } from './is_prettify_compatible_dashboard';

const grid = { x: 0, y: 0, w: 24, h: 15 };

const lensPanel = {
  type: LENS_EMBEDDABLE_TYPE,
  id: 'lens-1',
  grid,
  config: {
    type: 'metric',
    data_source: { type: 'data_view', id: 'logs-*' },
  },
};

const markdownPanel = {
  type: MARKDOWN_EMBEDDABLE_TYPE,
  id: 'md-1',
  grid,
  config: { content: '# Hello' },
};

const mapsPanel = {
  type: 'map',
  id: 'map-1',
  grid,
  config: {},
};

const dashboard = (panels: DashboardAttachmentData['panels']): DashboardAttachmentData =>
  ({
    title: 'Dash',
    panels,
  } as DashboardAttachmentData);

describe('isPrettifyCompatibleDashboard', () => {
  it('is compatible when the dashboard has a visualization', () => {
    expect(isPrettifyCompatibleDashboard(dashboard([lensPanel]))).toBe(true);
  });

  it('is compatible when visualizations sit next to markdown', () => {
    expect(isPrettifyCompatibleDashboard(dashboard([markdownPanel, lensPanel]))).toBe(true);
  });

  it('is compatible when visualizations are mixed types', () => {
    expect(isPrettifyCompatibleDashboard(dashboard([lensPanel, mapsPanel]))).toBe(true);
  });

  it('is compatible when visualizations live inside a section', () => {
    expect(
      isPrettifyCompatibleDashboard(
        dashboard([
          {
            id: 'sec-1',
            title: 'Section',
            collapsed: false,
            grid: { y: 0 },
            panels: [mapsPanel],
          },
        ])
      )
    ).toBe(true);
  });

  it('is not compatible when the dashboard has no visualizations', () => {
    expect(isPrettifyCompatibleDashboard(dashboard([]))).toBe(false);
    expect(isPrettifyCompatibleDashboard(dashboard([markdownPanel]))).toBe(false);
  });
});
