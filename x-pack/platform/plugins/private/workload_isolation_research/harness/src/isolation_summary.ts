/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Doc } from './score';
import { scoreRun } from './score';

/** Recomputes every run from raw data; invalid runs contribute no comparison rows. */
export const summarizeIsolationRuns = (dirs: readonly string[]): object[] =>
  dirs.map((dir) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as Doc;
    const samples = fs
      .readFileSync(path.join(dir, 'samples.ndjson'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Doc);
    const result = scoreRun(manifest, samples);
    return {
      run_id: manifest.run_id,
      source_commit: manifest.source_commit,
      variant: manifest.variant,
      target: manifest.target.kind,
      scenario: manifest.workload_params.name,
      utc_start: manifest.utc_start,
      utc_end: manifest.utc_end,
      run_valid: result.run_valid,
      invalid_reasons: result.run_invalid_reasons,
      discovery_heartbeat_acknowledgements: [
        ...new Set(
          samples
            .filter((doc) => doc.source === 'tm' && doc.tm_event === 'DISCOVERY_HEARTBEAT')
            .map((doc) => String(doc.boot_id))
        ),
      ].map((bootId) => {
        const beats = samples
          .filter(
            (doc) =>
              doc.boot_id === bootId &&
              doc.source === 'tm' &&
              doc.tm_event === 'DISCOVERY_HEARTBEAT'
          )
          .sort((left, right) => left.ts - right.ts);
        const gaps = beats.slice(1).map((beat, index) => beat.ts - beats[index].ts);
        return {
          boot_id: bootId,
          observed: beats.length,
          failed: beats.filter((beat) => !beat.ok).length,
          max_ack_gap_ms: gaps.length ? Math.max(...gaps) : null,
          scope: 'discovery acknowledgements only; not task lease-renewal telemetry',
        };
      }),
      rows: result.run_valid
        ? result.pods.map((row) => ({
            phase: row.phase,
            pod: row.pod,
            boot_id: row.boot_id,
            role: row.role,
            probe_p95_ms: row.metrics.probe_p95_ms,
            probe_p95_ratio: row.vs_baseline.probe_p95,
            hb_gap_full_ms: row.metrics.hb_gap_max_full_ms,
            hb_window_max_ms: row.metrics.hb_window_max_ms,
            tm_poll_gap_ms: row.metrics.tm_poll_max_gap_ms,
            tm_missed_cycles: row.metrics.tm_missed_poll_cycles,
            rss_sampled_max_mb: row.metrics.rss_sampled_max_mb,
            heap_sampled_max_mb: row.metrics.heap_sampled_max_mb,
            tick_metrics: result.cluster.find((cluster) => cluster.phase === row.phase)?.metrics,
            tick_baseline_ratios: result.cluster.find((cluster) => cluster.phase === row.phase)
              ?.vs_baseline,
            offenders: result.cluster.find((cluster) => cluster.phase === row.phase)?.offenders,
            tier_b: result.cluster.find((cluster) => cluster.phase === row.phase)?.tier_b,
          }))
        : [],
    };
  });
