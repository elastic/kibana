/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SampleDoc = Record<string, unknown> & {
  source: string;
  ts: number;
};

export interface OffenderSpec {
  readonly kind:
    | 'cpu_spin'
    | 'json_stringify'
    | 'regex_backtrack'
    | 'microtask_chain'
    | 'infinite_loop';
  readonly doseMs: number;
  readonly mode: 'route' | 'task';
  readonly sizeMb?: number;
}

export interface Phase {
  readonly name: string;
  /** Idle/measurement time after the phase action completes. */
  readonly durationS: number;
  readonly offender?: OffenderSpec;
  /** Arbitrary named action implemented by the driver (e.g. Tier B replays). */
  readonly action?: string;
  readonly actionParams?: Record<string, unknown>;
}

export interface Scenario {
  readonly name: string;
  readonly description: string;
  readonly phases: readonly Phase[];
  readonly probe: { readonly rps: number; readonly path: string; readonly timeoutMs?: number };
  readonly laptopProbe: { readonly rps: number; readonly path: string };
  readonly ticks: { readonly intervalMs: number };
  /** Optional emulated external supervisor (kill after stall ms) for non-terminating offenders. */
  readonly superviseKillAfterMs?: number;
}

/** Run manifest; fields follow the programme PRD (Data and provenance). */
export interface RunManifest {
  run_id: string;
  '@timestamp': string;
  lane: string;
  hypothesis: string;
  expected: Record<string, unknown>;
  variant: string;
  source_commit: string;
  source_dirty: boolean;
  baseline_commit: string;
  image_digest: string | null;
  qaf_project_id: string | null;
  target: { kind: 'local' | 'qaf'; url: string };
  workload_params: Scenario;
  utc_start: string;
  utc_end?: string;
  driver_version: string;
  config_overrides: Record<string, unknown>;
  tm_poll_interval_ms: number | null;
  tm_claim_strategy: string | null;
  pods: Array<Record<string, unknown>>;
  host: Record<string, unknown>;
  phases: Array<{
    name: string;
    start: number;
    end: number;
    offender_result?: Record<string, unknown>;
  }>;
  notes: string[];
  status: 'running' | 'complete' | 'failed';
}
