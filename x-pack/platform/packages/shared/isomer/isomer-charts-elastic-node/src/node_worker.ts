/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The drawing thread: owns the jsdom window and Skia, and answers one draw message at a time.

import { parentPort, workerData } from 'node:worker_threads';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import type { Theme } from '@elastic/charts';
import type { ChartArtifact, ChartNode, DrawRequest } from '@kbn/isomer-primitives-charts';

import type { ChartHints } from '@kbn/isomer-charts-elastic';
import { createStaticDraw, type FontFile } from './node_draw';

export interface WorkerOptions {
  hints?: ChartHints;
  fonts?: readonly FontFile[];
  pixelRatio?: number;
  /** Resolved per mode on the main thread, since a function cannot cross into a worker. */
  baseThemes?: { light: Theme; dark: Theme };
}

export interface DrawMessage {
  id: number;
  node: ChartNode;
  request: DrawRequest;
}

/** Sent once, when the thread can draw, or why it cannot. */
export type ReadyMessage = { ready: true } | { ready: false; error: string };

export type DrawReply =
  | { id: number; artifact: ChartArtifact; memory?: NodeJS.MemoryUsage }
  | { id: number; error: string };

// With `ISOMER_MEMORY_PROBE` set, each reply carries this thread's memory after a forced GC: what a drawing leaves live.
const probing = Boolean(process.env.ISOMER_MEMORY_PROBE);
const gc = ((): (() => void) | undefined => {
  if (!probing) {
    return undefined;
  }
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
})();
const measure = (): { memory?: NodeJS.MemoryUsage } => {
  if (!probing) {
    return {};
  }
  gc?.();
  return { memory: process.memoryUsage() };
};

const { baseThemes, ...options } = workerData as WorkerOptions;
const drawing = createStaticDraw({
  ...options,
  ...(baseThemes === undefined ? {} : { baseTheme: (mode: 'light' | 'dark') => baseThemes[mode] }),
});

drawing.then(
  () => parentPort?.postMessage({ ready: true } satisfies ReadyMessage),
  (error: unknown) =>
    parentPort?.postMessage({
      ready: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies ReadyMessage)
);

parentPort?.on('message', ({ id, node, request }: DrawMessage) => {
  void drawing
    .then((draw) => ({ id, artifact: draw(node, request), ...measure() }))
    .catch((error: unknown) => ({
      id,
      error: error instanceof Error ? error.message : String(error),
    }))
    .then((reply: DrawReply) => parentPort?.postMessage(reply));
});
