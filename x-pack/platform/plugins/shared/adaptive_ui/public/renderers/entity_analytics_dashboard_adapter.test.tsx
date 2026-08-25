/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import {
  sampleEntityAnalyticsDashboard,
  toEntityAnalyticsDashboardViewSpec,
} from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('security.entity_analytics_dashboard attachment adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toEntityAnalyticsDashboardViewSpec(sampleEntityAnalyticsDashboard);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('finance-db-01');
    expect(rendered).toContain('Critical');
    expect(rendered).toContain('Impossible travel for a.wong');
    expect(spec.body.some((node) => node.type === 'donut')).toBe(true);
  });

  it('emits a donut from severity_count when distribution is omitted', () => {
    const spec = toEntityAnalyticsDashboardViewSpec({
      severity_count: { critical: 5, high: 12, medium: 34, low: 88 },
    });
    const donutNode = spec.body.find((node) => node.type === 'donut');
    expect(donutNode).toEqual(
      expect.objectContaining({
        type: 'donut',
        label: 'Risk distribution',
      })
    );
  });
});
