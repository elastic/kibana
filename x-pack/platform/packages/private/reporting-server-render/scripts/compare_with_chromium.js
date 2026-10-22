/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dev-only visual comparison: generates the same dashboard through the Chromium export type
 * (`pngV2`) and the server-render one (`pngServer`) via Kibana's own reporting API, downloads
 * both, and writes (to OUT_DIR):
 *
 *   - `<dashboard>.contact_sheet.png`: Chromium | server render | pixel diff, side by side
 *   - `<dashboard>.summary.json`: per-panel ink coverage in each and mismatch percentage
 *
 * and prints a per-panel table. Exits non-zero when a panel that has content in Chromium is
 * (nearly) blank in the server render -- the failure this tool exists to catch.
 *
 * Needs a running Kibana with `xpack.reporting.experimental.serverRender: true` and a working
 * local Chromium (`x-pack/platform/plugins/shared/screenshotting/chromium`).
 *
 *   KIBANA_URL=http://localhost:5601 BASE_PATH=/mje DASHBOARD_ID=<id> \
 *     node x-pack/platform/packages/private/reporting-server-render/scripts/compare_with_chromium.js [outDir]
 */
require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const os = require('os');
const pixelmatch = require('pixelmatch');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';
const BASE_PATH = process.env.BASE_PATH || '';
const DASHBOARD_ID = process.env.DASHBOARD_ID;
const AUTH = process.env.AUTH || 'elastic:changeme';
const OUT_DIR = process.argv[2] || path.join(os.tmpdir(), 'reporting-compare');
const PAGE_WIDTH = 1200;
const BLANK_THRESHOLD_PCT = Number(process.env.BLANK_THRESHOLD_PCT || 1);
const MIN_INK_RATIO = Number(process.env.MIN_INK_RATIO || 0.25);

if (!DASHBOARD_ID) {
  console.error('FAILED: set DASHBOARD_ID to a saved dashboard id');
  process.exit(1);
}

const base = `${KIBANA_URL}${BASE_PATH}`;
const headers = {
  authorization: `Basic ${Buffer.from(AUTH).toString('base64')}`,
  'kbn-xsrf': 'compare',
  'x-elastic-internal-origin': 'kibana',
  'content-type': 'application/json',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generate = async (exportType, jobParams) => {
  const response = await fetch(`${base}/api/reporting/generate/${exportType}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobParams }),
  });
  if (!response.ok) {
    throw new Error(`generate ${exportType} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()).job.id;
};

const waitForJob = async (id, label) => {
  for (let i = 0; i < 120; i++) {
    const info = await (
      await fetch(`${base}/internal/reporting/jobs/info/${id}`, { headers })
    ).json();
    if (info.status === 'completed' || info.status === 'completed_with_warnings') return info;
    if (info.status === 'failed') {
      throw new Error(
        `${label} job failed: ${JSON.stringify(info.output || info.error).slice(0, 500)}`
      );
    }
    await sleep(2500);
  }
  throw new Error(`${label} job ${id} did not finish in time`);
};

const download = async (id) => {
  const response = await fetch(`${base}/api/reporting/jobs/download/${id}`, { headers });
  if (!response.ok) throw new Error(`download ${id} failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

/** `(a:b,c:!(d,e))` rison for the small, fixed job-params shape used here. */
const jobParamsRison = ({ height, locatorAsArray }) => {
  const locator =
    `(id:DASHBOARD_APP_LOCATOR,params:(dashboardId:'${DASHBOARD_ID}',preserveSavedFilters:!t,` +
    `timeRange:(from:now-7d,to:now),useHash:!f,viewMode:view),version:'9.6.0')`;
  return (
    `(layout:(dimensions:(height:${height},width:${PAGE_WIDTH}),id:preserve_layout),` +
    `locatorParams:${locatorAsArray ? `!(${locator})` : locator},objectType:dashboard,` +
    `title:'compare',version:'9.6.0')`
  );
};

const toWidth = async (png, width) => {
  const image = await loadImage(png);
  const height = Math.round((image.height * width) / image.width);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx, width, height };
};

const region = (ctx, { left, top, width, height }, maxW, maxH) => {
  const x = Math.max(0, Math.round(left));
  const y = Math.max(0, Math.round(top));
  const w = Math.max(1, Math.min(Math.round(width), maxW - x));
  const h = Math.max(1, Math.min(Math.round(height), maxH - y));
  return ctx.getImageData(x, y, w, h);
};

const inkPct = (imageData) => {
  const { data } = imageData;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) ink++;
  }
  return (100 * ink) / (data.length / 4);
};

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { LoopbackHttpClient } = require('../src/services/loopback_http_client');
  const { resolveDashboardPanelLayout } = require('../src/worker/resolve_dashboard_panels');
  const {
    computePanelPixelPositions,
    computePageSize,
  } = require('../src/worker/dashboard_panel_layout');

  const client = new LoopbackHttpClient({
    baseUrl: KIBANA_URL,
    basePath: BASE_PATH,
    forwardedHeaders: { authorization: headers.authorization },
  });
  const { title, panels } = await resolveDashboardPanelLayout(client, DASHBOARD_ID);
  const positions = computePanelPixelPositions(panels, { containerWidthPx: PAGE_WIDTH });
  const { height } = computePageSize(positions, { containerWidthPx: PAGE_WIDTH });

  console.log(
    `Generating "${title}" (${positions.length} panels, ${PAGE_WIDTH}x${height}) via Chromium and server render ...`
  );
  const [chromiumId, serverId] = await Promise.all([
    generate('pngV2', jobParamsRison({ height, locatorAsArray: false })),
    generate('pngServer', jobParamsRison({ height, locatorAsArray: true })),
  ]);
  const [chromiumInfo, serverInfo] = await Promise.all([
    waitForJob(chromiumId, 'chromium'),
    waitForJob(serverId, 'server render'),
  ]);
  console.log(
    `chromium ${chromiumInfo.execution_time_ms}ms, server render ${serverInfo.execution_time_ms}ms` +
      `${
        serverInfo.output && serverInfo.output.warnings && serverInfo.output.warnings.length
          ? `, warnings: ${serverInfo.output.warnings.join('; ')}`
          : ''
      }`
  );
  const [chromiumPng, serverPng] = await Promise.all([download(chromiumId), download(serverId)]);
  const slug = DASHBOARD_ID.slice(0, 8);
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.chromium.png`), chromiumPng);
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.server.png`), serverPng);

  const a = await toWidth(chromiumPng, PAGE_WIDTH);
  const b = await toWidth(serverPng, PAGE_WIDTH);
  const rows = [];
  let failed = 0;
  const diffCanvas = createCanvas(PAGE_WIDTH, Math.max(a.height, b.height));
  const diffCtx = diffCanvas.getContext('2d');
  diffCtx.fillStyle = '#fff';
  diffCtx.fillRect(0, 0, diffCanvas.width, diffCanvas.height);

  positions.forEach((position, index) => {
    const ra = region(a.ctx, position, a.width, a.height);
    const rb = region(b.ctx, position, b.width, b.height);
    const w = Math.min(ra.width, rb.width);
    const h = Math.min(ra.height, rb.height);
    // Same-size crops so pixelmatch can compare.
    const ca = a.ctx.getImageData(Math.round(position.left), Math.round(position.top), w, h);
    const cb = b.ctx.getImageData(Math.round(position.left), Math.round(position.top), w, h);
    const diff = diffCtx.createImageData(w, h);
    const mismatched = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold: 0.2 });
    diffCtx.putImageData(diff, Math.round(position.left), Math.round(position.top));
    const chromiumInk = inkPct(ra);
    const serverInk = inkPct(rb);
    // Blank, or missing most of what Chromium drew (a panel with a fraction of its content).
    const blank =
      chromiumInk >= BLANK_THRESHOLD_PCT &&
      serverInk < Math.max(BLANK_THRESHOLD_PCT, chromiumInk * MIN_INK_RATIO);
    if (blank) failed++;
    rows.push({
      index,
      panel: position.title || position.panelIndex,
      type: position.type || '',
      chromiumInkPct: Number(chromiumInk.toFixed(1)),
      serverInkPct: Number(serverInk.toFixed(1)),
      mismatchPct: Number(((100 * mismatched) / (w * h)).toFixed(1)),
      blank,
    });
  });

  // Contact sheet: Chromium | server | diff, each scaled to 600px wide.
  const colWidth = 600;
  const scale = colWidth / PAGE_WIDTH;
  const sheetHeight = Math.round(Math.max(a.height, b.height) * scale);
  const sheet = createCanvas(colWidth * 3 + 20, sheetHeight);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#888';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  [a.canvas, b.canvas, diffCanvas].forEach((canvas, i) => {
    sctx.drawImage(canvas, i * (colWidth + 10), 0, colWidth, Math.round(canvas.height * scale));
  });
  const sheetPath = path.join(OUT_DIR, `${slug}.contact_sheet.png`);
  fs.writeFileSync(sheetPath, sheet.toBuffer('image/png'));
  fs.writeFileSync(
    path.join(OUT_DIR, `${slug}.summary.json`),
    JSON.stringify(
      {
        dashboard: title,
        chromiumMs: chromiumInfo.execution_time_ms,
        serverMs: serverInfo.execution_time_ms,
        panels: rows,
      },
      null,
      2
    )
  );

  console.log('\n#  type            chromium%  server%  mismatch%  panel');
  for (const r of rows) {
    console.log(
      `${String(r.index).padEnd(3)}${r.type.padEnd(16)}${String(r.chromiumInkPct).padEnd(
        11
      )}${String(r.serverInkPct).padEnd(9)}${String(r.mismatchPct).padEnd(11)}${
        r.blank ? 'UNDER  ' : ''
      }${r.panel}`
    );
  }
  console.log(`\nContact sheet: ${sheetPath}`);
  if (failed > 0) {
    console.error(
      `FAILED: ${failed} panel(s) blank or mostly missing in the server render but not in Chromium`
    );
    process.exit(2);
  }
  console.log('OK: no blank panels');
};

main().catch((error) => {
  console.error('FAILED:', error);
  process.exit(1);
});
