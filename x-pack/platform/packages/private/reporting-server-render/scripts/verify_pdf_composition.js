/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Spike D's proof that a dashboard-shaped page (a chart panel rasterized in Spike A's
 * headless worker, plus a markdown-style panel) composes into a real multi-page-capable
 * PDF through takumi, with no browser anywhere in the pipeline. Run with:
 *
 *   node x-pack/platform/packages/private/reporting-server-render/scripts/verify_pdf_composition.js [outPath]
 *
 * (`takumi-pdf`'s wasm module does not initialize under Jest's module loader -- see the
 * comment in `rasterize_page.test.ts` -- so this script, not the Jest suite, is the
 * authoritative proof for the PDF path.)
 */

require('@kbn/setup-node-env');
const path = require('path');
const fs = require('fs');
const {
  renderElasticChartsToPng,
  buildSampleLineChartElement,
} = require('../src/worker/render_elastic_charts_to_png');
const { pngPanelHtml } = require('../src/composer/page_composer');
const { rasterizePagesToPdf } = require('../src/composer/rasterize_page');

const outPath =
  process.argv[2] || path.join(require('os').tmpdir(), 'reporting-server-render-spike-d.pdf');

(async () => {
  let rendered = false;
  const element = buildSampleLineChartElement({
    width: 360,
    height: 260,
    onRenderChange: (r) => {
      rendered = r;
    },
  });
  const { png: chartPng } = renderElasticChartsToPng({
    element,
    width: 360,
    height: 260,
    isRendered: () => rendered,
  });

  const pdf = await rasterizePagesToPdf([
    {
      width: 800,
      height: 400,
      title: 'Sample Dashboard (server-rendered)',
      panels: [
        {
          left: 16,
          top: 40,
          width: 380,
          height: 300,
          title: 'Revenue over time',
          html: pngPanelHtml(chartPng, { width: 364, height: 260 }),
        },
        {
          left: 410,
          top: 40,
          width: 374,
          height: 300,
          title: 'Notes',
          html: '<p>Markdown panel content, lowered to plain HTML.</p>',
        },
      ],
    },
  ]);

  const isPdf = pdf.subarray(0, 4).toString() === '%PDF';
  // A near-empty page (title/border markup only, no embedded chart) is a handful of KB;
  // a real embedded 360x260 PNG pushes this well past that -- confirmed live: this exact
  // check is what catches `page_composer.ts`'s `.reportingPanel { overflow: hidden }`
  // silently dropping every `<img>` from takumi-pdf's output while still producing a
  // structurally valid, `%PDF`-signed PDF (see that file's doc comment). A signature check
  // alone, this script's only check before that finding, passed on the broken output too.
  const MIN_EXPECTED_BYTES = 12_000;
  if (!rendered || !isPdf || pdf.length < MIN_EXPECTED_BYTES) {
    // eslint-disable-next-line no-console
    console.error('FAILED: did not produce a valid, chart-containing PDF', {
      rendered,
      isPdf,
      byteLength: pdf.length,
      minExpectedBytes: MIN_EXPECTED_BYTES,
    });
    process.exit(1);
  }

  fs.writeFileSync(outPath, pdf);
  // eslint-disable-next-line no-console
  console.log(`OK: wrote ${pdf.length} byte PDF to ${outPath}`);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
