/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

interface CurveRow {
  phase: string;
  role: string;
  probe_p95_ratio: number | null;
  hb_gap_full_ms: number | null;
  hb_window_max_ms: number | null;
}
interface CurveRun {
  run_id: string;
  target: string;
  variant: string;
  run_valid: boolean;
  rows: CurveRow[];
}
const input = process.argv[2];
const output = process.argv[3];
assert.ok(input && output);
const target = process.env.WIR_PLOT_TARGET ?? 'local';
const runs = (JSON.parse(readFileSync(input, 'utf8')) as CurveRun[]).filter(
  (run) => run.run_valid && run.target === target
);
const pieces = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1150" height="1000" viewBox="0 0 1150 1000"><rect width="1150" height="1000" fill="white"/>',
];
const text = (x: number, y: number, label: string, size = 14): void => {
  pieces.push(
    `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="#222">${label
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')}</text>`
  );
};
text(30, 30, `Track1 ${target}: task-only Tier A (whole-run VALID data only)`, 22);
text(
  30,
  54,
  'Red = main; blue = isolated. Individual run curves, not confidence bands. p99 inference excluded.'
);
text(
  30,
  76,
  'Left: in-pod p95 / own idle baseline. Right: heartbeat-gap proxy (NOT an exact execution slice).'
);
const families = ['cpu_spin', 'json_stringify', 'regex_backtrack', 'microtask_chain'];
for (const [familyIndex, family] of families.entries()) {
  for (const [panel, metric] of ['probe', 'gap'].entries()) {
    const x0 = 80 + panel * 550;
    const y0 = 130 + familyIndex * 210;
    const width = 440;
    const height = 135;
    const low = metric === 'probe' ? 0.5 : 10;
    const high = metric === 'probe' ? 1000 : 20000;
    const role = target === 'local' ? 'combined' : metric === 'probe' ? 'ui' : 'background';
    const y = (value: number): number =>
      y0 +
      height -
      ((Math.log10(Math.max(low, value)) - Math.log10(low)) /
        (Math.log10(high) - Math.log10(low))) *
        height;
    text(x0, y0 - 14, `${family}: ${metric === 'probe' ? 'p95 ratio' : 'gap ms'} (${role})`, 15);
    pieces.push(`<path d="M${x0},${y0}V${y0 + height}H${x0 + width}" fill="none" stroke="#333"/>`);
    for (const tick of metric === 'probe' ? [1, 10, 100, 1000] : [10, 100, 1000, 10000]) {
      pieces.push(`<path d="M${x0},${y(tick)}H${x0 + width}" stroke="#ddd"/>`);
      text(x0 - 52, y(tick) + 4, String(tick), 11);
    }
    for (const [index, dose] of [10, 100, 1000, 10000].entries())
      text(x0 + (index * width) / 3 - 12, y0 + height + 20, String(dose), 11);
    for (const run of runs) {
      const color =
        run.variant.includes('main') || run.variant.includes('control') ? '#b42318' : '#175cd3';
      const points = run.rows
        .filter((row) => row.role === role && row.phase.startsWith(`${family}-task-`))
        .map((row) => {
          const match = /-task-(\d+)ms$/.exec(row.phase);
          const dose = Number(match?.[1]);
          const value =
            metric === 'probe'
              ? row.probe_p95_ratio
              : Math.max(row.hb_gap_full_ms ?? 0, row.hb_window_max_ms ?? 0);
          return { dose, value };
        })
        .filter(
          (point): point is { dose: number; value: number } =>
            point.dose > 0 && point.value !== null && point.value > 0
        )
        .sort((left, right) => left.dose - right.dose);
      const coords = points.map(
        (point) => `${x0 + ((Math.log10(point.dose) - 1) / 3) * width},${y(point.value)}`
      );
      if (coords.length)
        pieces.push(
          `<polyline points="${coords.join(
            ' '
          )}" stroke="${color}" stroke-width="2" opacity="0.7" fill="none"/>`
        );
      for (const coord of coords) {
        const [cx, cy] = coord.split(',');
        pieces.push(`<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>`);
      }
    }
  }
}
text(
  30,
  965,
  'x: nominal dose ms, log scale. Actual measured blocks and all run IDs remain in raw summaries/scorecards.',
  12
);
text(
  30,
  985,
  'No sub-50ms QAF claim. Local idle/unrelated gaps may exceed50ms; do not mistake containment for a global guarantee.',
  12
);
pieces.push('</svg>');
writeFileSync(output, pieces.join('\n'));
