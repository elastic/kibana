/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

export interface CgroupCpuSnapshot {
  readonly readable: boolean;
  readonly cgroup_version?: 1 | 2;
  readonly nr_periods?: number;
  readonly nr_throttled?: number;
  readonly throttled_usec?: number;
  readonly cpu_quota_us?: number | null;
  readonly cpu_period_us?: number | null;
  readonly cpu_quota_cores?: number | null;
}

/** Reads this container's cumulative CPU throttling counters without moving config objects. */
export const readCgroupCpu = (
  read: (file: string) => string = (file) => readFileSync(file, 'utf8')
): CgroupCpuSnapshot => {
  for (const version of [2, 1] as const) {
    const prefix = version === 2 ? '/sys/fs/cgroup' : '/sys/fs/cgroup/cpu';
    try {
      const counters = new Map(
        read(`${prefix}/cpu.stat`)
          .trim()
          .split('\n')
          .map((line) => {
            const [key, value] = line.trim().split(/\s+/);
            return [key, Number(value)];
          })
      );
      const nrPeriods = counters.get('nr_periods');
      const nrThrottled = counters.get('nr_throttled');
      const throttled = counters.get(version === 2 ? 'throttled_usec' : 'throttled_time');
      if (
        ![nrPeriods, nrThrottled, throttled].every(
          (value) => value !== undefined && Number.isFinite(value) && value >= 0
        )
      )
        continue;
      let quota: number | null = null;
      let period: number | null = null;
      try {
        const values =
          version === 2
            ? read(`${prefix}/cpu.max`).trim().split(/\s+/)
            : [
                read(`${prefix}/cpu.cfs_quota_us`).trim(),
                read(`${prefix}/cpu.cfs_period_us`).trim(),
              ];
        const parsedQuota = Number(values[0]);
        const parsedPeriod = Number(values[1]);
        quota = Number.isFinite(parsedQuota) && parsedQuota > 0 ? parsedQuota : null;
        period = Number.isFinite(parsedPeriod) && parsedPeriod > 0 ? parsedPeriod : null;
      } catch {
        // Throttling counters may be readable even when the quota file is not.
      }
      return {
        readable: true,
        cgroup_version: version,
        nr_periods: nrPeriods,
        nr_throttled: nrThrottled,
        throttled_usec: version === 2 ? throttled : Number(throttled) / 1000,
        cpu_quota_us: quota,
        cpu_period_us: period,
        cpu_quota_cores: quota !== null && period !== null ? quota / period : null,
      };
    } catch {
      // Missing/denied cgroup files are evidence of unavailable telemetry, not zero throttling.
    }
  }
  return { readable: false };
};
