/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Spike A's proof that Elastic Charts renders under Kibana's packaged
 * `--disallow-code-generation-from-strings` flag, without going through Jest (whose own
 * haste-map tooling uses `new Function` and would fail under the flag for reasons that
 * have nothing to do with this package). Run directly with:
 *
 *   node --disallow-code-generation-from-strings \
 *     x-pack/platform/packages/private/reporting-server-render/scripts/verify_packaged_kibana_constraint.js
 *
 * Writes a PNG to the path given as the first argument (defaults to a temp file) and exits
 * non-zero if rendering did not produce a valid PNG.
 */

require('@kbn/setup-node-env');
const path = require('path');
const {
  renderElasticChartsToPng,
  buildSampleLineChartElement,
} = require('../src/worker/render_elastic_charts_to_png');

const outPath =
  process.argv[2] || path.join(require('os').tmpdir(), 'reporting-server-render-spike-a.png');

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

const isPng = png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47;
if (!rendered || !isPng) {
  // eslint-disable-next-line no-console
  console.error('FAILED: chart did not render to a valid PNG', { rendered, isPng });
  process.exit(1);
}

require('fs').writeFileSync(outPath, png);
// eslint-disable-next-line no-console
console.log(
  `OK: wrote ${png.length} byte PNG to ${outPath} (flag active: ${
    process.execArgv.includes('--disallow-code-generation-from-strings') ||
    (process.env.NODE_OPTIONS || '').includes('--disallow-code-generation-from-strings')
  })`
);
