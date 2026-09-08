/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * TEMPORARY analysis helper (DO NOT MERGE) for elastic/kibana-team#3973.
 *
 * Parses a forced-GC experiment CSV (post_gc rows) and derives the average
 * retained heap overhead per index via ordinary least squares, so we can
 * estimate how much heap N storage-adapter system indices would cost.
 *
 * Usage:
 *   node x-pack/platform/plugins/private/storage_adapter_heap_lab/scripts/analyze_overhead.js <csv>
 */

const fs = require('fs');

const MB = 1024 * 1024;
const KB = 1024;

function parseCsv(file) {
  const [header, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n');
  const cols = header.split(',');
  return lines
    .filter(Boolean)
    .map((line) => {
      // note is the last column and may be empty; simple split is safe here
      const cells = line.split(',');
      return cols.reduce((row, name, i) => ({ ...row, [name]: cells[i] }), {});
    });
}

// ordinary least squares: y = slope * x + intercept
function linreg(points) {
  const n = points.length;
  const sx = points.reduce((a, p) => a + p.x, 0);
  const sy = points.reduce((a, p) => a + p.y, 0);
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
  const syy = points.reduce((a, p) => a + p.y * p.y, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const r = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return { slope, intercept, r2: r * r };
}

function main() {
  const file = process.argv[2];
  if (!file) {
    // eslint-disable-next-line no-console
    console.error('usage: analyze_overhead.js <csv>');
    process.exit(1);
  }

  const rows = parseCsv(file).filter((r) => r.phase === 'post_gc');
  if (rows.length < 2) {
    // eslint-disable-next-line no-console
    console.error(`need >=2 post_gc rows, found ${rows.length}`);
    process.exit(1);
  }

  const points = rows.map((r) => ({
    x: Number(r.indices_count),
    y: Number(r.heap_used_bytes),
    fields: Number(r.total_dedup_field_count),
  }));

  const base = points[0];
  const last = points[points.length - 1];

  const heapFit = linreg(points);
  // per-field fit uses deduplicated field count (distinct mappings => grows 1:1)
  const fieldFit = linreg(points.map((p) => ({ x: p.fields, y: p.y })));

  const idxDelta = last.x - base.x;
  const heapDelta = last.y - base.y;

  // eslint-disable-next-line no-console
  console.log(`\n=== per-index heap overhead (post-GC live set) — ${file} ===\n`);
  // eslint-disable-next-line no-console
  console.log(
    `samples: ${points.length} post_gc points, indices ${base.x} -> ${last.x}, ` +
      `dedup fields ${base.fields} -> ${last.fields}`
  );
  // eslint-disable-next-line no-console
  console.log(
    `baseline live set: ${(base.y / MB).toFixed(0)} MB   final live set: ${(last.y / MB).toFixed(
      0
    )} MB   delta: ${(heapDelta / MB).toFixed(0)} MB over ${idxDelta} indices`
  );
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log(
    `OLS slope (heap ~ indices):  ${(heapFit.slope / KB).toFixed(1)} KB / index   ` +
      `(R^2=${heapFit.r2.toFixed(4)}, intercept=${(heapFit.intercept / MB).toFixed(0)} MB)`
  );
  // eslint-disable-next-line no-console
  console.log(
    `simple avg (delta/indices):  ${(heapDelta / idxDelta / KB).toFixed(1)} KB / index`
  );
  // eslint-disable-next-line no-console
  console.log(
    `OLS slope (heap ~ fields):   ${(fieldFit.slope / KB).toFixed(2)} KB / field    ` +
      `(R^2=${fieldFit.r2.toFixed(4)})`
  );

  const perIndex = heapFit.slope;
  // eslint-disable-next-line no-console
  console.log(`\n--- extrapolation (structural, near-empty shards) ---`);
  [100, 200, 300, 500].forEach((n) => {
    // eslint-disable-next-line no-console
    console.log(`  ${n} indices -> ~${((perIndex * n) / MB).toFixed(0)} MB retained`);
  });

  // Henning's segment term for realistic (populated) shards:
  //   heap ~= num_segments*55kb + num_fields*1kb + num_shards*75kb
  // our measured slope already includes 1 shard + ~1 segment + fields; add the
  // extra segments a populated shard accrues.
  // eslint-disable-next-line no-console
  console.log(`\n--- realistic estimate (add segments per Henning's formula) ---`);
  [14, 30].forEach((segs) => {
    const extraSegs = segs - 1; // measured shard already has ~1 segment
    const realisticPerIndex = perIndex + extraSegs * 55 * KB;
    // eslint-disable-next-line no-console
    console.log(
      `  @${segs} segments/shard: ~${(realisticPerIndex / KB).toFixed(0)} KB/index -> ` +
        [100, 300, 500]
          .map((n) => `${n}:${((realisticPerIndex * n) / MB).toFixed(0)}MB`)
          .join('  ')
    );
  });
  // eslint-disable-next-line no-console
  console.log('');
}

main();
