/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeMetricReadings } from './metric_dom';
import { readMetricSvg } from './engine';

describe('readMetricSvg', () => {
  it("reads tiles from headless Elastic Charts' SVG, joining a value and its unit", () => {
    const svg = `<svg>
      <defs><clipPath id="clip0" clipPathUnits="userSpaceOnUse"><path d="M0 0L300 0L300 200L0 200Z"/></clipPath><clipPath id="clip1" clipPathUnits="userSpaceOnUse"><path d="M16 16L284 16L284 184L16 184Z"/></clipPath></defs>
      <rect width="300" height="200" fill="#FFFFFF"/>
      <path d="M0 0L300 0L300 200L0 200Z" fill="rgb(252,196,0)" clip-path="url(#clip0)"/>
      <g clip-path="url(#clip1)"><text x="16" y="31.42" fill="rgb(17,28,44)">Unique Visitors</text></g>
      <g clip-path="url(#clip1)"><text x="184" y="173.38" font-size="45" fill="#384861">-828</text></g>
      <g clip-path="url(#clip1)"><text x="250" y="173.38" font-size="30" fill="#384861">%</text></g>
    </svg>`;
    const readings = readMetricSvg(svg);
    expect(readings).toHaveLength(1);
    expect(normalizeMetricReadings(readings)).toEqual({
      kind: 'metric',
      tiles: [
        {
          background: '#fcc400',
          texts: [
            { text: 'Unique Visitors', color: '#111c2c' },
            { text: '-828%', color: '#384861' },
          ],
        },
      ],
    });
  });
});
