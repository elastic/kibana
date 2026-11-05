/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeMetricReadings } from './metric_dom';
import { readMetricMarkup } from './engine';

describe('readMetricMarkup', () => {
  it('reads tiles as the corpus reads them from the page, with inherited inline colors', () => {
    const html = `
      <div class="echMetricContainer">
        <article class="echMetric" style="background-color: rgb(252, 196, 0); color: rgb(17, 28, 44)">
          <h2><span>Unique Visitors</span></h2>
          <p class="echMetricText__value" style="color: rgb(56, 72, 97)">-828<span class="echMetricText__part">%</span></p>
        </article>
      </div>`;
    const readings = readMetricMarkup(html);
    expect(readings).toHaveLength(1);
    expect(readings[0].backgroundColor).toBe('rgb(252, 196, 0)');
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
