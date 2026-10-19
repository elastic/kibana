/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

interface Measurement {
  readonly run_id?: string;
  readonly transport?: string;
  readonly slots?: number;
  readonly resident_capsules?: number;
  readonly batch_cold_ms?: number;
  readonly cold_ready_ms?: number;
  readonly isolate_heap_samples_sum?: number;
  readonly isolate_ready_heap_sum?: number;
  readonly process_rss_after_all_resident?: number;
  readonly process_rss_delta?: number;
  readonly parent_rss_delta?: number;
  readonly child_ready_rss_sum?: number | null;
  readonly headless_boot?: boolean;
  readonly snapshot?: {
    readonly heap_used: number;
    readonly rss: number;
    readonly registry_types: number;
  };
}

const mib = (value?: number | null): number | null =>
  value === undefined || value === null ? null : value / 1024 / 1024;

for (const path of process.argv.slice(2)) {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith('{"')) continue;
    const record = JSON.parse(line) as Measurement;
    if (!record.run_id && record.slots === undefined) continue;
    process.stdout.write(
      JSON.stringify({
        run_id: record.run_id ?? null,
        source_file: basename(path),
        transport: record.headless_boot ? 'headless_process' : record.transport ?? 'thread_capsule',
        graph: record.headless_boot
          ? 'default_211_plugin_UI_graph'
          : record.resident_capsules
          ? 'SO_getter_fixture'
          : 'bare_wait_fixture',
        count: record.headless_boot ? 1 : record.resident_capsules ?? record.slots,
        cold_ms: record.batch_cold_ms ?? record.cold_ready_ms,
        isolate_heap_samples_mib: mib(
          record.snapshot?.heap_used ??
            record.isolate_heap_samples_sum ??
            record.isolate_ready_heap_sum
        ),
        process_rss_mib: mib(record.snapshot?.rss ?? record.process_rss_after_all_resident),
        process_or_parent_rss_delta_mib: mib(record.process_rss_delta ?? record.parent_rss_delta),
        child_ready_rss_sum_mib: mib(record.child_ready_rss_sum),
        comparison_valid: false,
        caveat: 'different_graphs_sampled_heap_and_RSS_not_cgroup_PSS_peak_or_real_service_mix',
      }) + '\n'
    );
  }
}
