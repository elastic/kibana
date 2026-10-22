/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderElasticChartsToPng,
  buildSampleLineChartElement,
} from './render_elastic_charts_to_png';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

describe('Spike A: Elastic Charts in a headless jsdom + skia worker', () => {
  it('renders a chart to a real PNG without a browser', () => {
    let rendered = false;
    const element = buildSampleLineChartElement({
      width: 600,
      height: 300,
      onRenderChange: (r) => {
        rendered = r;
      },
    });

    const { png } = renderElasticChartsToPng({
      element,
      width: 600,
      height: 300,
      isRendered: () => rendered,
    });

    expect(rendered).toBe(true);
    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.length).toBeGreaterThan(0);
    expect(Array.from(png.subarray(0, 4))).toEqual(PNG_SIGNATURE);
  });

  it('renders under --disallow-code-generation-from-strings (packaged-Kibana constraint)', () => {
    // This test only proves the constraint when the Jest worker process itself was
    // launched with the flag; see the package README for how to run that check manually
    // (`node --disallow-code-generation-from-strings node_modules/.bin/jest ...`), since
    // Jest's worker pool does not expose a way to set V8 flags per test file.
    if (!process.execArgv.includes('--disallow-code-generation-from-strings')) {
      // eslint-disable-next-line no-console
      console.warn(
        'This process was not started with --disallow-code-generation-from-strings; ' +
          'skipping the packaged-Kibana assertion. Run the npm script documented in the ' +
          "package README's Spike A section to exercise it."
      );
      return;
    }

    let rendered = false;
    const element = buildSampleLineChartElement({
      width: 600,
      height: 300,
      onRenderChange: (r) => {
        rendered = r;
      },
    });

    const { png } = renderElasticChartsToPng({
      element,
      width: 600,
      height: 300,
      isRendered: () => rendered,
    });

    expect(rendered).toBe(true);
    expect(Array.from(png.subarray(0, 4))).toEqual(PNG_SIGNATURE);
  });
});
