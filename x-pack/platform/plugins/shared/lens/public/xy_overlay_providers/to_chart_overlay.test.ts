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
  it('maps every field of the Lens overlay to the chart overlay, keeping the data rows', () => {
    const row = { '@timestamp': 1000, value: 42 };
    const xAccessor = (datum: Record<string, number>) => datum['@timestamp'];
    const overlay: LensXYOverlay = {
      type: 'points',
      providerId: 'observability.exemplars',
      layerId: 'metrics',
      title: 'Exemplars',
      data: [row],
      xAccessor,
      yAccessor: 'value',
    };

    const chartOverlay = toChartOverlay(overlay);

    expect(chartOverlay).toStrictEqual<XYOverlay>({
      type: 'points',
      id: 'observability.exemplars',
      layerId: 'metrics',
      title: 'Exemplars',
      data: [row],
      xAccessor,
      yAccessor: 'value',
    });
    expect(chartOverlay.data[0]).toBe(row);
  });
});
