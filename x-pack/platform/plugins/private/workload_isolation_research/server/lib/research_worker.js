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

const { parentPort, workerData } = require('worker_threads');
const { Atomics } = global;
const { performance } = require('perf_hooks');
const v8 = require('v8');

const epochNow = () => performance.timeOrigin + performance.now();

const { sab, countSab, samplerIntervalMs, stallThresholdMs, ringCapacity } = workerData;
// heartbeat[0]: epoch ms of main's last heartbeat; hbCount[0]: number of heartbeats written
// (single writer = main thread; read with Atomics so aggregated heartbeats are detectable).
const heartbeat = new Float64Array(sab);
const hbCount = new Int32Array(countSab);

let probe = undefined;
let inFlight = 0;

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
// Live stall detector (works while main is blocked). The authoritative post-hoc slice proxy
// is main-side `main_gap` accounting in recorder.ts; this side only:
//  - opens a stall when main has not written a heartbeat for > stallThresholdMs,
//  - records a worker-observed gap only when exactly one heartbeat elapsed (otherwise the
//    worker itself was late and the observed gap aggregates several healthy heartbeats),
//  - records its own sampling lateness so its resolution is explicit.
let lastHb = heartbeat[0];
let lastCount = Atomics.load(hbCount, 0);
let openStall = undefined;
let windowStart = epochNow();
let supervisor = undefined;
let windowMaxGap = 0;
let windowHbCount = 0;
let windowAggregated = 0;
let windowLateMax = 0;
let lastTick = epochNow();

setInterval(() => {
  const now = epochNow();
  const late = now - lastTick - samplerIntervalMs;
  lastTick = now;
  if (late > windowLateMax) windowLateMax = late;
  const hb = heartbeat[0];
  const count = Atomics.load(hbCount, 0);
  if (count !== lastCount) {
    const dCount = count - lastCount;
    const gap = hb - lastHb;
    if (lastHb > 0) {
      windowHbCount += dCount;
      if (dCount === 1) {
        if (gap > windowMaxGap) windowMaxGap = gap;
        if (gap > stallThresholdMs) {
          push({
            source: 'stall',
            ts: lastHb,
            start: lastHb,
            end: hb,
            gap_ms: gap,
            live_detected: !!openStall,
          });
        }
      } else {
        windowAggregated++;
        if (openStall) {
          // The stall ended somewhere among dCount heartbeats; the main-side record is exact.
          push({
            source: 'stall',
            ts: openStall.start,
            start: openStall.start,
            end: hb,
            gap_ms: hb - openStall.start,
            live_detected: true,
            aggregated_heartbeats: dCount,
          });
        }
      }
    }
    openStall = undefined;
    lastHb = hb;
    lastCount = count;
  } else if (lastHb > 0 && now - lastHb > stallThresholdMs && !openStall) {
    openStall = { start: lastHb, detectedAt: now };
    push({ source: 'stall_open', ts: now, start: lastHb });
  }
  if (supervisor && openStall && now - openStall.start > supervisor.killAfterMs) {
    // Emulated supervision. fd-2 write because worker stdout is relayed through the blocked main
    // thread. NOTE: serverless log shipping does not ingest these raw fd-2 lines (Track 0 report).
    require('fs').writeSync(
      2,
      JSON.stringify({
        research: 'supervisor_kill',
        ts: now,
        stall_ms: now - openStall.start,
        pid: process.pid,
      }) + '\n'
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
      aggregated_observations: windowAggregated,
      sampler_late_max_ms: windowLateMax,
    });
    windowStart = now;
    windowMaxGap = 0;
    windowHbCount = 0;
    windowAggregated = 0;
    windowLateMax = 0;
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
    push({
      source: 'probe',
      ts: intended,
      intended,
      sent: undefined,
      end: epochNow(),
      status: 0,
      error: 'max_in_flight',
      run_id: p.runId,
    });
    return;
  }
  inFlight++;
  const sent = epochNow();
  p.fetchImpl(p.url, { headers: p.headers, signal: AbortSignal.timeout(p.timeoutMs), ...p.extra })
    .then(async (res) => {
      await res.arrayBuffer();
      const end = epochNow();
      push({
        source: 'probe',
        ts: intended,
        intended,
        sent,
        end,
        latency_ms: end - intended,
        service_ms: end - sent,
        status: res.status,
        run_id: p.runId,
      });
    })
    .catch((err) => {
      const end = epochNow();
      push({
        source: 'probe',
        ts: intended,
        intended,
        sent,
        end,
        latency_ms: end - intended,
        service_ms: end - sent,
        status: 0,
        error: String((err && err.name) || err),
        error_code: String((err && err.cause && (err.cause.code || err.cause.name)) || ''),
        run_id: p.runId,
      });
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

const stopProbe = () => {
  if (probe && probe.timer) clearTimeout(probe.timer);
  probe = undefined;
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
      supervisor =
        msg.killAfterMs > 0
          ? { killAfterMs: msg.killAfterMs, signal: msg.signal || 'SIGKILL' }
          : undefined;
      parentPort.postMessage({ type: 'ack', reqId: msg.reqId });
      break;
    case 'samples': {
      const out = since(msg.since, msg.limit);
      parentPort.postMessage({
        type: 'samples',
        reqId: msg.reqId,
        ...out,
        probing: !!probe,
        inFlight,
      });
      break;
    }
    case 'push':
      push(msg.item);
      break;
  }
});
