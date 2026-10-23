/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageChannel } from 'node:worker_threads';
import {
  runWatchdogWorker,
  SAMPLE_EXPRESSION,
  type Cadence,
  type InspectorSession,
} from './worker';
import {
  monotonicUs,
  type CurrentTaskContext,
  type EventLoopBlockReport,
  type WorkerToMainMessage,
} from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const owner = (id: string): CurrentTaskContext => ({
  taskId: id,
  taskType: 'type',
  executionUuid: `uuid-${id}`,
});

/** Ten times faster than production, so a case needs a few hundred ms instead of seconds. */
const FAST: Cadence = {
  pollIntervalMs: 5,
  detectThresholdMs: 60,
  sampleAfterMs: 120,
  sampleIntervalMs: 40,
};

interface HarnessOpts {
  /** Runs at the production cadence. */
  realCadence?: boolean;
  /** Delay between an evaluate being posted and landing on the "main thread". */
  landDelayMs?: number;
  /** CPU time reported over the block, in microseconds. */
  cpuUs?: number;
}

const setup = ({ landDelayMs = 0, cpuUs = 10_000_000, realCadence = false }: HarnessOpts = {}) => {
  const shared = new BigInt64Array(new SharedArrayBuffer(8));
  let blocked = false;
  const beat = setInterval(() => {
    if (!blocked) Atomics.store(shared, 0, BigInt(monotonicUs()));
  }, 10);
  Atomics.store(shared, 0, BigInt(monotonicUs()));

  const state = { current: null as CurrentTaskContext | null };
  const evaluates: Array<{ expression: string; returnByValue?: boolean; silent?: boolean }> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  let sessions = 0;
  let disconnects = 0;
  const createSession = (): InspectorSession => {
    sessions++;
    return {
      connectToMainThread: jest.fn(),
      disconnect: () => {
        disconnects++;
      },
      post: (_method, params, callback) => {
        evaluates.push(params as never);
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        setTimeout(() => {
          inFlight--;
          callback(null, {
            result: { value: { at: monotonicUs(), task: state.current, missing: false } },
          });
        }, landDelayMs);
      },
    };
  };

  const channel = new MessageChannel();
  const messages: WorkerToMainMessage[] = [];
  channel.port1.on('message', (message: WorkerToMainMessage) => messages.push(message));
  const lines: string[] = [];
  runWatchdogWorker(
    channel.port2,
    {
      shared: shared.buffer as SharedArrayBuffer,
      flagThresholdMs: realCadence ? 800 : 200,
      minCpuRatio: 0.5,
      liveReportIntervalMs: realCadence ? 500 : 150,
    },
    {
      cadence: realCadence ? undefined : FAST,
      createSession,
      cpuUsage: (previous) => (previous ? { user: cpuUs, system: 0 } : { user: 0, system: 0 }),
      writeLine: (line) => lines.push(line),
    }
  );

  const block = async (ms: number) => {
    blocked = true;
    await sleep(ms);
    blocked = false;
  };
  const reports = (): EventLoopBlockReport[] =>
    messages.flatMap((m) => (m.type === 'block' ? [m.report] : []));
  const waitForReport = async () => {
    for (let i = 0; i < 100 && reports().length === 0; i++) await sleep(25);
    return reports()[0];
  };
  const stop = () => {
    clearInterval(beat);
    channel.port1.close();
    channel.port2.close();
  };
  return {
    state,
    block,
    waitForReport,
    stop,
    lines,
    evaluates,
    messages,
    counts: () => ({ sessions, disconnects, maxInFlight }),
  };
};

describe('runWatchdogWorker', () => {
  let h: ReturnType<typeof setup>;
  afterEach(() => h.stop());

  it('evaluates the current task with the expected options', async () => {
    h = setup();
    h.state.current = owner('a');
    await h.block(450);
    await h.waitForReport();
    expect(h.evaluates.length).toBeGreaterThan(0);
    expect(h.evaluates[0]).toEqual({
      expression: SAMPLE_EXPRESSION,
      returnByValue: true,
      silent: true,
    });
    expect(SAMPLE_EXPRESSION).toContain("Symbol.for('kbn.taskManager.currentTask')");
  });

  it('announces that it is polling before anything else', async () => {
    h = setup();
    await sleep(50);
    expect(h.messages[0]).toEqual({ type: 'ready' });
  });

  it('flags at the production cadence too', async () => {
    h = setup({ realCadence: true });
    h.state.current = owner('a');
    await h.block(1400);
    const report = await h.waitForReport();
    expect(report.flag).toMatchObject({ flagged: true, taskId: 'a' });
  }, 15_000);

  it('flags the task that was current for the whole block, then disconnects the session', async () => {
    h = setup();
    h.state.current = owner('a');
    await h.block(450);
    const report = await h.waitForReport();
    expect(report.flag).toMatchObject({ flagged: true, taskId: 'a', executionUuid: 'uuid-a' });
    expect(report.attribution.perTask).toHaveLength(1);
    expect(Number.isInteger(report.startedAtUs)).toBe(true);
    expect(Number.isInteger(report.endedAtUs)).toBe(true);
    expect(report.endedAtUs).toBeGreaterThan(report.startedAtUs);
    expect(h.counts()).toMatchObject({ sessions: 1, disconnects: 1 });
  });

  it('never has more than one evaluate in flight', async () => {
    h = setup({ landDelayMs: 100 });
    h.state.current = owner('a');
    await h.block(450);
    await h.waitForReport();
    expect(h.counts().maxInFlight).toBe(1);
  });

  it('does not flag a block that was one long uninterruptible call', async () => {
    // The evaluate posted early only lands near the end of the block, naming whoever runs next.
    h = setup({ landDelayMs: 300 });
    h.state.current = owner('b');
    await h.block(500);
    const report = await h.waitForReport();
    expect(report.flag).toEqual({ flagged: false, reason: 'opaque-dominated' });
    expect(report.attribution.opaqueMs).toBeGreaterThan(200);
  });

  it('does not flag a block with no task context', async () => {
    h = setup();
    h.state.current = null;
    await h.block(450);
    const report = await h.waitForReport();
    expect(report.flag).toEqual({ flagged: false, reason: 'no-context' });
  });

  it('does not flag when the process was not busy', async () => {
    h = setup({ cpuUs: 0 });
    h.state.current = owner('a');
    await h.block(450);
    const report = await h.waitForReport();
    expect(report.flag).toEqual({ flagged: false, reason: 'cpu-starved' });
  });

  it('does not open a session for a short block', async () => {
    h = setup();
    h.state.current = owner('a');
    await h.block(80);
    const report = await h.waitForReport();
    expect(report.flag).toEqual({ flagged: false, reason: 'below-threshold' });
    expect(h.counts().sessions).toBe(0);
  });

  it('writes a notice to stderr while the block is still going', async () => {
    h = setup();
    h.state.current = owner('a');
    await h.block(450);
    await h.waitForReport();
    expect(h.lines.some((line) => line.includes('still blocked') && line.includes('"a"'))).toBe(
      true
    );
  });
});
