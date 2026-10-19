/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Plain CommonJS so it loads identically in dev (source) and in the
 * built distribution without @kbn/setup-node-env.
 *
 * Runs off the main isolate and therefore keeps working while main is blocked:
 *  - sampler: watches a SharedArrayBuffer heartbeat written by main and records
 *    every inter-heartbeat gap above a threshold (stall episodes) plus a per-second
 *    max-gap window (longest uninterrupted main-thread slice upper bound);
 *  - probe: open-loop HTTP client hitting the main thread over loopback at a fixed
 *    rate, latency measured from the *intended* send time (no coordinated omission);
 *  - self accounting: this worker's own CPU / heap so lanes can subtract it.
 */

'use strict';

const { parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');
const v8 = require('v8');

const epochNow = () => performance.timeOrigin + performance.now();

const { sab, samplerIntervalMs, stallThresholdMs, ringCapacity } = workerData;
const heartbeat = new Float64Array(sab);

// ---- ring buffer -----------------------------------------------------------
const ring = new Array(ringCapacity);
let nextSeq = 1;
const push = (item) => {
  const seq = nextSeq++;
  ring[seq % ringCapacity] = { seq, item };
};
const since = (s, limit) => {
  const oldest = Math.max(1, nextSeq - ringCapacity);
  const from = Math.max(s + 1, oldest);
  const dropped = Math.max(0, oldest - (s + 1));
  const entries = [];
  for (let seq = from; seq < nextSeq && entries.length < limit; seq++) {
    const e = ring[seq % ringCapacity];
    if (e && e.seq === seq) entries.push(e);
  }
  return { entries, dropped, lastSeq: nextSeq - 1 };
};

// ---- heartbeat sampler -----------------------------------------------------
let lastHb = heartbeat[0];
let openStall = undefined;
let windowStart = epochNow();
let supervisor = undefined;
let windowMaxGap = 0;
let windowHbCount = 0;

setInterval(() => {
  const now = epochNow();
  const hb = heartbeat[0];
  if (hb !== lastHb) {
    const gap = hb - lastHb;
    if (lastHb > 0) {
      windowHbCount++;
      if (gap > windowMaxGap) windowMaxGap = gap;
      if (gap > stallThresholdMs) {
        push({ source: 'stall', ts: lastHb, start: lastHb, end: hb, gap_ms: gap, live_detected: !!openStall });
      }
    }
    openStall = undefined;
    lastHb = hb;
  } else if (lastHb > 0 && now - lastHb > stallThresholdMs && !openStall) {
    openStall = { start: lastHb, detectedAt: now };
    push({ source: 'stall_open', ts: now, start: lastHb });
  }
  if (supervisor && openStall && now - openStall.start > supervisor.killAfterMs) {
    // Emulated external supervision for non-terminating offenders. Written with a
    // direct fd write because worker stdout is relayed through the (blocked) main thread.
    require('fs').writeSync(
      2,
      JSON.stringify({ research: 'supervisor_kill', ts: now, stall_ms: now - openStall.start, pid: process.pid }) + '\n'
    );
    process.kill(process.pid, supervisor.signal);
    supervisor = undefined;
  }
  if (now - windowStart >= 1000) {
    // Include an in-progress stall so a window fully inside a block reports it.
    const ongoing = lastHb > 0 ? now - lastHb : 0;
    push({
      source: 'gap_window',
      ts: windowStart,
      end: now,
      max_gap_ms: Math.max(windowMaxGap, ongoing),
      hb_count: windowHbCount,
    });
    windowStart = now;
    windowMaxGap = 0;
    windowHbCount = 0;
  }
}, samplerIntervalMs);

// ---- self accounting -------------------------------------------------------
let lastElu = performance.eventLoopUtilization();
let lastCpu = typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage() : undefined;
setInterval(() => {
  const elu = performance.eventLoopUtilization(lastElu);
  lastElu = performance.eventLoopUtilization();
  let cpuMs;
  if (lastCpu) {
    const cpu = process.threadCpuUsage(lastCpu);
    lastCpu = process.threadCpuUsage();
    cpuMs = (cpu.user + cpu.system) / 1000;
  }
  const heap = v8.getHeapStatistics();
  push({
    source: 'worker_proc',
    ts: epochNow(),
    elu: elu.utilization,
    thread_cpu_ms: cpuMs,
    heap_used: heap.used_heap_size,
    heap_total: heap.total_heap_size,
    probe_in_flight: inFlight,
  });
}, 1000);

// ---- probe -----------------------------------------------------------------
let probe = undefined;
let inFlight = 0;
let dispatcher;

const getFetch = (insecure) => {
  if (!insecure) return { fetchImpl: fetch, extra: {} };
  // eslint-disable-next-line import/no-extraneous-dependencies
  const undici = require('undici');
  dispatcher = dispatcher || new undici.Agent({ connect: { rejectUnauthorized: false } });
  return { fetchImpl: undici.fetch, extra: { dispatcher } };
};

const fireOne = (p, intended) => {
  if (inFlight >= p.maxInFlight) {
    push({ source: 'probe', ts: intended, intended, sent: undefined, end: epochNow(), status: 0, error: 'max_in_flight', run_id: p.runId });
    return;
  }
  inFlight++;
  const sent = epochNow();
  p.fetchImpl(p.url, { headers: p.headers, signal: AbortSignal.timeout(p.timeoutMs), ...p.extra })
    .then(async (res) => {
      await res.arrayBuffer();
      const end = epochNow();
      push({ source: 'probe', ts: intended, intended, sent, end, latency_ms: end - intended, service_ms: end - sent, status: res.status, run_id: p.runId });
    })
    .catch((err) => {
      const end = epochNow();
      push({ source: 'probe', ts: intended, intended, sent, end, latency_ms: end - intended, service_ms: end - sent, status: 0, error: String((err && err.name) || err), run_id: p.runId });
    })
    .finally(() => {
      inFlight--;
    });
};

const tick = () => {
  const p = probe;
  if (!p) return;
  const now = epochNow();
  // Fire every intended slot that is due (catch up after our own scheduling delays).
  while (p.next <= now) {
    fireOne(p, p.next);
    p.next += p.periodMs;
  }
  p.timer = setTimeout(tick, Math.max(0, p.next - epochNow()));
};

const startProbe = (msg) => {
  stopProbe();
  const { fetchImpl, extra } = getFetch(msg.insecure);
  probe = {
    url: msg.url,
    headers: msg.headers,
    periodMs: 1000 / msg.rps,
    timeoutMs: msg.timeoutMs,
    maxInFlight: msg.maxInFlight,
    runId: msg.runId,
    fetchImpl,
    extra,
    next: epochNow(),
  };
  tick();
};

const stopProbe = () => {
  if (probe && probe.timer) clearTimeout(probe.timer);
  probe = undefined;
};

parentPort.on('message', (msg) => {
  switch (msg.type) {
    case 'probe:start':
      startProbe(msg);
      parentPort.postMessage({ type: 'ack', reqId: msg.reqId });
      break;
    case 'probe:stop':
      stopProbe();
      parentPort.postMessage({ type: 'ack', reqId: msg.reqId });
      break;
    case 'supervise':
      supervisor = msg.killAfterMs > 0 ? { killAfterMs: msg.killAfterMs, signal: msg.signal || 'SIGKILL' } : undefined;
      parentPort.postMessage({ type: 'ack', reqId: msg.reqId });
      break;
    case 'samples': {
      const out = since(msg.since, msg.limit);
      parentPort.postMessage({ type: 'samples', reqId: msg.reqId, ...out, probing: !!probe, inFlight });
      break;
    }
    case 'push':
      push(msg.item);
      break;
  }
});
