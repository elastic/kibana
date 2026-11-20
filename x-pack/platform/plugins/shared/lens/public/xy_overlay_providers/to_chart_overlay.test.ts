/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYOverlay } from '@kbn/expression-xy-plugin/common';
import type { LensXYOverlay } from '@kbn/lens-common';
import { toChartOverlay } from './to_chart_overlay';

describe('toChartOverlay', () => {
  it('maps every field of the Lens overlay to the chart overlay', () => {
    const overlay: LensXYOverlay = {
      type: 'points',
      providerId: 'observability.exemplars',
      layerId: 'metrics',
      title: 'Exemplars',
      points: [{ id: 'trace-1', x: 1000, y: 42 }],
    };

    expect(toChartOverlay(overlay)).toStrictEqual<XYOverlay>({
      type: 'points',
      id: 'observability.exemplars',
      layerId: 'metrics',
      title: 'Exemplars',
      points: [{ id: 'trace-1', x: 1000, y: 42 }],
    });
  });
});
