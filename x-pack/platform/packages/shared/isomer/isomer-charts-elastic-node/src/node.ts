/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Static drawing in Node, off the host's thread: a worker owns the jsdom window, so this thread keeps no DOM globals.

import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import type { ChartArtifact, ChartEngine } from '@kbn/isomer-primitives-charts';

import {
  defineElasticChartsEngine,
  type ElasticChartsEngineOptions,
} from '@kbn/isomer-charts-elastic';
import type { NodeDrawOptions } from './node_draw';
import type { DrawMessage, DrawReply, ReadyMessage, WorkerOptions } from './node_worker';

export type { FontFile, NodeDrawOptions } from './node_draw';

/**
 * A packaged Kibana runs `node_worker.ts` built to `node_worker.js`; from source, a JS harness registers Kibana's
 * transpiler first, as screenshotting's PDF worker does.
 */
const workerEntry = join(
  __dirname,
  __filename.endsWith('.ts') ? 'node_worker_src_harness.js' : 'node_worker.js'
);

export interface NodeChartEngine extends ChartEngine {
  /** Stops the drawing thread; a draw after this rejects. */
  close: () => Promise<void>;
}

/**
 * {@link defineElasticChartsEngine} with a static `draw`, so `prepareCharts` gives the `html` and `snapshot`
 * surfaces each chart as Elastic Charts drew it. Charts draw in a worker thread, one at a time; resolves once
 * that thread is ready to draw.
 */
export const defineElasticChartsNodeEngine = async ({
  fonts,
  pixelRatio,
  ...options
}: ElasticChartsEngineOptions & NodeDrawOptions = {}): Promise<NodeChartEngine> => {
  const engine = defineElasticChartsEngine(options);
  const { hints, baseTheme } = options;
  const workerOptions: WorkerOptions = {
    ...(hints === undefined ? {} : { hints }),
    ...(fonts === undefined ? {} : { fonts }),
    ...(pixelRatio === undefined ? {} : { pixelRatio }),
    ...(baseTheme === undefined
      ? {}
      : {
          baseThemes:
            typeof baseTheme === 'function'
              ? { light: baseTheme('light'), dark: baseTheme('dark') }
              : { light: baseTheme, dark: baseTheme },
        }),
  };
  const worker = new Worker(workerEntry, {
    workerData: workerOptions,
  });
  const pending = new Map<
    number,
    {
      resolve: (artifact: ChartArtifact) => void;
      reject: (error: Error) => void;
    }
  >();
  // Resolves once the thread has loaded jsdom, React, and Elastic Charts, so that cost is paid here.
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    worker.once('error', onError);
    worker.once('message', (message: ReadyMessage) => {
      worker.off('error', onError);
      if (message.ready) {
        resolve();
      } else {
        void worker.terminate();
        reject(new Error(message.error));
      }
    });
  });
  // The thread keeps the process alive only while a drawing is owed.
  worker.unref();
  const settle = (id: number) => {
    const entry = pending.get(id);
    pending.delete(id);
    if (pending.size === 0) {
      worker.unref();
    }
    return entry;
  };
  worker.on('message', (reply: DrawReply) => {
    const entry = settle(reply.id);
    if ('artifact' in reply) {
      entry?.resolve(reply.artifact);
    } else {
      entry?.reject(new Error(reply.error));
    }
  });
  const failAll = (error: Error) => {
    for (const id of [...pending.keys()]) {
      settle(id)?.reject(error);
    }
  };
  let closed = false;
  worker.on('error', failAll);
  worker.on('exit', () => {
    closed = true;
    failAll(new Error('the chart drawing thread exited'));
  });
  let nextId = 0;
  return {
    ...engine,
    draw: (node, request) => {
      if (closed) {
        return Promise.reject(new Error('the chart drawing thread is closed'));
      }
      nextId += 1;
      const id = nextId;
      return new Promise<ChartArtifact>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.ref();
        worker.postMessage({ id, node, request } satisfies DrawMessage);
      });
    },
    close: async () => {
      await worker.terminate();
    },
  };
};
