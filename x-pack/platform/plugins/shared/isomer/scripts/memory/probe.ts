/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A dev tool: draws one exported dashboard composition over and over, under the memory probe, and tabulates
// what each draw costs. The composition comes from the isomerDashboards composition route (`*.isomer.json`).
//
//   node x-pack/platform/plugins/shared/isomer/scripts/probe_memory.js --composition flights.isomer.json \
//     [--format pdf|png|html] [--runs 3] [--layout grid|stack] [--width 1400] [--pixel-ratio 2] [--scale 1] \
//     [--inline] [--render-host [--heap-mb 256] [--pdf-thread worker|inline]] [--out probe.log]
//
// Records go to `data/<out>` (one JSON line per draw) through the probe, and the table at the end reads them back.

import { existsSync, readFileSync } from 'node:fs';

import { readFileSync as readDataFile, writeFileSync as writeDataFile } from '@kbn/fs';

import type { Composition } from '@elastic/isomer-sdk';
import { engineHintFromLens } from '@kbn/isomer-lowering';
import {
  DASHBOARD_FRAME,
  DASHBOARD_PAGE_PADDING,
  dashboardChartSize,
} from '@kbn/isomer-primitives-dashboard';
import type { MapGeometry } from '@kbn/isomer-primitives-maps';
import { fromRoot } from '@kbn/repo-info';

import type { DrawOptions } from '../../server/charts_drawing';
import type { ProbeRecord } from '../../server/memory_probe';

const WORLD_COUNTRIES = fromRoot(
  'x-pack/platform/plugins/shared/maps/test/scout/ui/fixtures/files/world_countries_v7.geo.json'
);
const PAGE_WIDTH = { grid: 1400, stack: 420 } as const;

type Format = 'pdf' | 'png' | 'html';
type Layout = keyof typeof PAGE_WIDTH;
type Hints = Record<string, Record<string, unknown>>;

const flags = (argv: string[]) => {
  const values: Record<string, string | true> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      values[arg.slice(2)] = true;
    } else {
      values[arg.slice(2)] = next;
      index += 1;
    }
  }
  return values;
};

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1).padStart(7);
const kb = (bytes: number) =>
  Math.round(bytes / 1024)
    .toString()
    .padStart(7);

/** Every node in the composition with an id the hints name, so hints convert ahead of a cross-process draw. */
const nodesById = (value: unknown, hints: Hints, found: Map<string, unknown> = new Map()) => {
  if (Array.isArray(value)) {
    value.forEach((item) => nodesById(item, hints, found));
  } else if (value && typeof value === 'object') {
    const { id } = value as { id?: unknown };
    if (typeof id === 'string' && hints[id] && 'type' in value) {
      found.set(id, value);
    }
    Object.values(value).forEach((item) => nodesById(item, hints, found));
  }
  return found;
};

const stageOf = (record: ProbeRecord, name: string) =>
  record.stages.find(({ stage }) => stage === name);

const summarize = (records: ProbeRecord[]) => {
  const header = [
    'run',
    'ms',
    'charts',
    'artifactKB',
    'htmlKB',
    'cssKB',
    'outKB',
    'startHeap',
    'chartsHeap',
    'markupHeap',
    'rasterHeap',
    'relHeap',
    'wrkHeap',
    'peakRSS',
    'peakHeap',
    'peakExt',
    'gcRSS',
    'gcHeap',
    'gcHeapTot',
    'gcNative',
  ];
  process.stdout.write(`${header.map((cell) => cell.padStart(10)).join('')}\n`);
  for (const record of records) {
    const start = stageOf(record, 'start');
    const charts = stageOf(record, 'charts');
    const markup = stageOf(record, 'markup');
    const raster = stageOf(record, 'raster');
    const released = stageOf(record, 'released');
    const cells = [
      String(record.draw),
      String(record.totalMs),
      String(charts?.notes?.charts ?? ''),
      kb(Number(charts?.notes?.artifactBytes ?? 0)),
      kb(Number(markup?.notes?.htmlBytes ?? 0)),
      kb(Number(markup?.notes?.cssBytes ?? 0)),
      kb(Number(raster?.notes?.outputBytes ?? 0)),
      mb(start?.heapUsed ?? 0),
      mb(charts?.heapUsed ?? 0),
      mb(markup?.heapUsed ?? 0),
      mb(raster?.heapUsed ?? 0),
      mb(released?.heapUsed ?? 0),
      mb(charts?.worker?.heapUsed ?? 0),
      mb(record.peak.rss),
      mb(record.peak.heapUsed),
      mb(record.peak.external),
      mb(record.residue.rss),
      mb(record.residue.heapUsed),
      mb(record.residue.heapTotal),
      // What V8 does not account for: Skia, takumi, jsdom's native bits, code and the worker's own heap.
      mb(
        record.residue.rss -
          record.residue.heapTotal -
          record.residue.external -
          (released?.worker?.heapTotal ?? 0) -
          (released?.worker?.external ?? 0)
      ),
    ];
    process.stdout.write(`${cells.map((cell) => cell.padStart(10)).join('')}\n`);
  }
};

export const run = async () => {
  const args = flags(process.argv.slice(2));
  const file = args.composition;
  if (typeof file !== 'string') {
    throw new Error('--composition <file.isomer.json> is required');
  }
  const format = (args.format as Format | undefined) ?? 'pdf';
  const runs = Number(args.runs ?? 3);
  const layout = (args.layout as Layout | undefined) ?? 'grid';
  const width = Number(args.width ?? PAGE_WIDTH[layout]);
  const scale = args.scale === undefined ? undefined : Number(args.scale);
  const pixelRatio = args['pixel-ratio'] === undefined ? undefined : Number(args['pixel-ratio']);
  const out = typeof args.out === 'string' ? args.out : `isomer-memory-probe-${process.pid}.log`;
  const { path: outPath } = writeDataFile(out, '');
  process.env.ISOMER_MEMORY_PROBE = out;

  const { composition, hints = {} } = JSON.parse(readFileSync(file, 'utf8')) as {
    composition: Composition;
    hints?: Hints;
  };
  const geometry: MapGeometry = existsSync(WORLD_COUNTRIES)
    ? { world_countries: JSON.parse(readFileSync(WORLD_COUNTRIES, 'utf8')) }
    : {};
  const gridWidth = width - 2 * DASHBOARD_PAGE_PADDING;
  const before = process.memoryUsage();
  process.stdout.write(
    `${file}: ${format} x${runs}, ${layout} at ${width}px${
      pixelRatio === undefined ? '' : `, pixel ratio ${pixelRatio}`
    }${scale === undefined ? '' : `, scale ${scale}`}${args.inline ? ', inline charts' : ''}${
      args['render-host'] ? ', render host' : ''
    }\nbefore engines: rss ${mb(before.rss)} MB heap ${mb(before.heapUsed)} MB\n`
  );

  if (args['render-host']) {
    const { createRenderHost } = await import('../../server/render_host/client');
    const nodes = nodesById(composition, hints);
    const chartHints = Object.fromEntries(
      [...nodes].map(([id, node]) => [id, engineHintFromLens(hints[id] as never, node as never)])
    ) as Record<string, Record<string, unknown>>;
    const host = createRenderHost({
      geometry,
      ...(args['heap-mb'] === undefined ? {} : { heapMb: Number(args['heap-mb']) }),
      ...(args['pdf-thread'] === undefined
        ? {}
        : { pdfThread: args['pdf-thread'] as 'worker' | 'inline' }),
    });
    try {
      for (let index = 0; index < runs; index += 1) {
        const hostOptions = {
          frame: DASHBOARD_FRAME,
          width,
          dashboardWidth: gridWidth,
          chartHints,
          ...(scale === undefined ? {} : { scale }),
        };
        const bytes =
          format === 'pdf'
            ? await host.drawPdf(composition, hostOptions)
            : await host.drawPng(composition, hostOptions);
        process.stdout.write(
          `run ${index + 1}: ${kb(bytes.byteLength)} KB ${format} from pid ${host.pid}\n`
        );
      }
    } finally {
      await host.close();
    }
  } else {
    const { createChartsDrawing } = await import('../../server/charts_drawing');
    const drawing = await createChartsDrawing({
      geometry,
      inline: Boolean(args.inline),
      ...(pixelRatio === undefined ? {} : { pixelRatio }),
    });
    const ready = process.memoryUsage();
    process.stdout.write(`engines up: rss ${mb(ready.rss)} MB heap ${mb(ready.heapUsed)} MB\n`);
    const options: DrawOptions = {
      width,
      frame: DASHBOARD_FRAME,
      sizeFor: dashboardChartSize(gridWidth) as DrawOptions['sizeFor'],
      hintFor: (node) => {
        const hint = node.id === undefined ? undefined : hints[node.id];
        return hint
          ? (engineHintFromLens(hint as never, node as never) as Record<string, unknown>)
          : undefined;
      },
    };
    try {
      for (let index = 0; index < runs; index += 1) {
        if (format === 'pdf') {
          await drawing.drawPdf(composition, options);
        } else if (format === 'png') {
          await drawing.drawPng(composition, {
            ...options,
            ...(scale === undefined ? {} : { scale }),
          });
        } else {
          await drawing.drawHtml(composition, options);
        }
      }
    } finally {
      await drawing.close();
    }
  }
  const records = String(readDataFile(out))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProbeRecord);
  process.stdout.write(`\n${records.length} probe records in ${outPath}\n`);
  summarize(records);
};
