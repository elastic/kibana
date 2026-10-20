/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readCgroupCpu } from './cgroup_cpu';
const reader =
  (files: Record<string, string>) =>
  (file: string): string => {
    if (!(file in files)) throw new Error('not readable');
    return files[file];
  };
it('reads v2 CPU quota and cumulative counters', () => {
  expect(
    readCgroupCpu(
      reader({
        '/sys/fs/cgroup/cpu.stat': 'nr_periods 20\nnr_throttled 3\nthrottled_usec 1234\n',
        '/sys/fs/cgroup/cpu.max': '200000 100000',
      })
    )
  ).toEqual({
    readable: true,
    cgroup_version: 2,
    nr_periods: 20,
    nr_throttled: 3,
    throttled_usec: 1234,
    cpu_quota_us: 200000,
    cpu_period_us: 100000,
    cpu_quota_cores: 2,
  });
});
it('converts v1 throttled nanoseconds to microseconds', () => {
  expect(
    readCgroupCpu(
      reader({
        '/sys/fs/cgroup/cpu/cpu.stat': 'nr_periods 20\nnr_throttled 3\nthrottled_time 1234000',
        '/sys/fs/cgroup/cpu/cpu.cfs_quota_us': '200000',
        '/sys/fs/cgroup/cpu/cpu.cfs_period_us': '100000',
      })
    )
  ).toMatchObject({ readable: true, cgroup_version: 1, throttled_usec: 1234, cpu_quota_cores: 2 });
});
it('does not call missing or malformed counters zero', () => {
  expect(readCgroupCpu(reader({}))).toEqual({ readable: false });
  expect(
    readCgroupCpu(
      reader({ '/sys/fs/cgroup/cpu.stat': 'nr_periods nope\nnr_throttled 0\nthrottled_usec 0' })
    )
  ).toEqual({ readable: false });
});
it('keeps unlimited or unavailable quota distinct from zero', () => {
  expect(
    readCgroupCpu(
      reader({
        '/sys/fs/cgroup/cpu.stat': 'nr_periods 20\nnr_throttled 0\nthrottled_usec 0',
        '/sys/fs/cgroup/cpu.max': 'max 100000',
      })
    )
  ).toMatchObject({ readable: true, cpu_quota_cores: null });
});
