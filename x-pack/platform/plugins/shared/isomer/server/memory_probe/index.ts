/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendFileSync } from '@kbn/fs';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

/**
 * `ISOMER_MEMORY_PROBE`: unset for no probe, `1` to log to stderr, or a `.log` file name under Kibana's `data`
 * directory to append each draw's record to as a JSON line as well.
 */
const ENV = 'ISOMER_MEMORY_PROBE';
const SAMPLE_MS = 5;

export type MemoryStage = 'start' | 'charts' | 'markup' | 'raster' | 'released';

interface Sample {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface StageRecord extends Sample {
  stage: MemoryStage;
  /** Milliseconds since the probe started. */
  at: number;
  /** The chart worker's own isolate, when the engine reports it. */
  worker?: Sample;
  /** Whatever the stage wants on record: byte counts, chart counts. */
  notes?: Record<string, number | string>;
}

export interface ProbeRecord {
  probe: 'isomer';
  pid: number;
  thread: 'main' | 'worker';
  label: string;
  draw: number;
  stages: StageRecord[];
  peak: { rss: number; heapUsed: number; external: number; samples: number };
  /** After the draw and a forced GC: what the draw left behind. */
  residue: Sample;
  totalMs: number;
}

export interface MemoryProbe {
  readonly enabled: boolean;
  stage(name: MemoryStage, notes?: StageRecord['notes'], worker?: Sample): void;
  done(): ProbeRecord | undefined;
}

export const probeTarget = (): string | undefined => process.env[ENV] || undefined;

/** `gc` as exposed by `--expose-gc`, else turned on at runtime; `undefined` where neither works. */
const resolveGc = (): (() => void) | undefined => {
  const exposed = (globalThis as { gc?: () => void }).gc;
  if (exposed) {
    return exposed;
  }
  try {
    setFlagsFromString('--expose-gc');
    return runInNewContext('gc') as () => void;
  } catch {
    return undefined;
  }
};

const sample = (): Sample => {
  const { rss, heapUsed, heapTotal, external, arrayBuffers } = process.memoryUsage();
  return { rss, heapUsed, heapTotal, external, arrayBuffers };
};

export const sampleMemory = sample;

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

const describe = ({ label, draw, stages, peak, residue, totalMs, thread, pid }: ProbeRecord) => {
  const line = stages
    .map(
      ({ stage, heapUsed, external, worker }) =>
        `${stage} heap ${mb(heapUsed)} ext ${mb(external)}${
          worker ? ` (worker heap ${mb(worker.heapUsed)} ext ${mb(worker.external)})` : ''
        }`
    )
    .join(' | ');
  return `[isomer memory probe] ${label} #${draw} ${thread}@${pid} ${totalMs} ms: ${line} | PEAK rss ${mb(
    peak.rss
  )} heap ${mb(peak.heapUsed)} ext ${mb(peak.external)} | after gc rss ${mb(residue.rss)} heap ${mb(
    residue.heapUsed
  )} ext ${mb(residue.external)}`;
};

let draws = 0;
let sampler: { peaks: Float64Array; worker: Worker } | undefined;

/** One RSS sampler thread for the process, started on the first probe. */
const samplerPeaks = (): Float64Array | undefined => {
  if (sampler) {
    return sampler.peaks;
  }
  try {
    const shared = new SharedArrayBuffer(2 * Float64Array.BYTES_PER_ELEMENT);
    const worker = new Worker(join(__dirname, 'sampler_worker.js'), {
      workerData: { shared, intervalMs: SAMPLE_MS },
    });
    worker.unref();
    worker.on('error', () => {
      sampler = undefined;
    });
    sampler = { peaks: new Float64Array(shared), worker };
    return sampler.peaks;
  } catch {
    return undefined;
  }
};

const disabled: MemoryProbe = { enabled: false, stage: () => {}, done: () => undefined };

/**
 * Records one draw's memory: each stage after a forced GC, the peak across the draw (RSS from a sampler thread, so
 * synchronous spikes count; heap and external from this thread while its loop is free), and what remains after.
 * Writes one line per draw to stderr, and as JSON to the data-directory file `ISOMER_MEMORY_PROBE` names, if it names one.
 */
export const createMemoryProbe = (
  label: string,
  { thread = 'main' }: { thread?: 'main' | 'worker' } = {}
): MemoryProbe => {
  const target = probeTarget();
  if (!target) {
    return disabled;
  }
  const gc = resolveGc();
  const started = performance.now();
  draws += 1;
  const draw = draws;
  const stages: StageRecord[] = [];
  const peaks = samplerPeaks();
  if (peaks) {
    peaks[0] = 0;
    peaks[1] = 0;
  }
  const peak = { rss: 0, heapUsed: 0, external: 0, samples: 0 };
  const tick = () => {
    const now = sample();
    peak.rss = Math.max(peak.rss, now.rss);
    peak.heapUsed = Math.max(peak.heapUsed, now.heapUsed);
    peak.external = Math.max(peak.external, now.external);
    peak.samples += 1;
  };
  const timer = setInterval(tick, SAMPLE_MS);
  timer.unref();
  tick();
  return {
    enabled: true,
    stage: (name, notes, worker) => {
      tick();
      gc?.();
      stages.push({
        stage: name,
        at: Math.round(performance.now() - started),
        ...sample(),
        ...(worker ? { worker } : {}),
        ...(notes ? { notes } : {}),
      });
    },
    done: () => {
      clearInterval(timer);
      tick();
      gc?.();
      if (peaks) {
        peak.rss = Math.max(peak.rss, peaks[0]);
        peak.samples += peaks[1];
      }
      const record: ProbeRecord = {
        probe: 'isomer',
        pid: process.pid,
        thread,
        label,
        draw,
        stages,
        peak,
        residue: sample(),
        totalMs: Math.round(performance.now() - started),
      };
      process.stderr.write(`${describe(record)}\n`);
      if (target !== '1') {
        try {
          appendFileSync(target, `${JSON.stringify(record)}\n`);
        } catch (error) {
          process.stderr.write(
            `[isomer memory probe] could not append to data/${target}: ${String(error)}\n`
          );
        }
      }
      return record;
    },
  };
};
