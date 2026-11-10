/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatEvidenceForAgent } from './format_evidence';

describe('formatEvidenceForAgent', () => {
  it('summarizes the chart after the description', () => {
    expect(
      formatEvidenceForAgent({
        description: 'Errors spiked.',
        chart: {
          type: 'line',
          title: 'Errors per minute',
          x_axis: { type: 'time' },
          y_axis: { unit: 'number' },
          series: [
            {
              name: 'checkout',
              points: [
                { x: '2024-01-01T00:00:00.000Z', y: 1 },
                { x: '2024-01-01T00:01:00.000Z', y: 9 },
              ],
            },
          ],
          annotations: [{ x: '2024-01-01T00:01:00.000Z', label: 'Deploy' }],
        },
      })
    ).toBe(
      [
        'Errors spiked.',
        'Chart "Errors per minute" (line, time x axis (number)): checkout: 2 points, 1 to 9',
        'Annotations: Deploy at 2024-01-01T00:01:00.000Z',
      ].join('\n')
    );
  });
});
