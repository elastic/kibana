/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Reads the process cgroup. A missing file stays null, not zero. */

import { readFileSync } from 'fs';

export interface CgroupAccount {
  readonly current: number | null;
  readonly anon: number | null;
  readonly file: number | null;
  readonly inactiveFile: number | null;
  readonly shmem: number | null;
  readonly peak: number | null;
  readonly oom: number | null;
  readonly oomKill: number | null;
  readonly workingSet: number | null;
}

const CURRENT = '/sys/fs/cgroup/memory.current';
const PEAK = '/sys/fs/cgroup/memory.peak';
const STAT = '/sys/fs/cgroup/memory.stat';
const EVENTS = '/sys/fs/cgroup/memory.events';
const BOOT_ID = '/proc/sys/kernel/random/boot_id';

/** Parses `key value` lines. Absent keys stay absent so a later lookup can return null. */
export const parseKeyValue = (text: string | null): Readonly<Record<string, number>> => {
  const out: Record<string, number> = {};
  if (text == null) return out;
  for (const line of text.split('\n')) {
    const match = /^([a-z0-9_]+)\s+(\d+)$/.exec(line.trim());
    if (!match) continue;
    out[match[1]] = Number(match[2]);
  }
  return out;
};

const integerOrNull = (text: string | null): number | null => {
  if (text == null) return null;
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const valueOrNull = (map: Readonly<Record<string, number>>, key: string): number | null =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;

/** Working set is current minus reclaimable file cache. Either input missing leaves it null. */
export const accountFromFiles = (read: (file: string) => string | null): CgroupAccount => {
  const current = integerOrNull(read(CURRENT));
  const stat = parseKeyValue(read(STAT));
  const events = parseKeyValue(read(EVENTS));
  const inactiveFile = valueOrNull(stat, 'inactive_file');
  return {
    current,
    anon: valueOrNull(stat, 'anon'),
    file: valueOrNull(stat, 'file'),
    inactiveFile,
    shmem: valueOrNull(stat, 'shmem'),
    peak: integerOrNull(read(PEAK)),
    oom: valueOrNull(events, 'oom'),
    oomKill: valueOrNull(events, 'oom_kill'),
    workingSet: current != null && inactiveFile != null ? current - inactiveFile : null,
  };
};

export const readCgroupText = (file: string): string | null => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

export const readCgroupAccount = (): CgroupAccount => accountFromFiles(readCgroupText);

/** Kernel boot id. Anything that is not a short hex id is dropped. */
export const readBootId = (text: string | null): string | null => {
  const value = text?.trim() ?? '';
  return /^[0-9a-f-]{1,64}$/i.test(value) ? value : null;
};

export const readKernelBootId = (): string | null => readBootId(readCgroupText(BOOT_ID));

/** Pod name from the hostname. Control characters and overlong names are dropped. */
export const podName = (hostname: string): string => hostname.replace(/[^\w.-]/g, '').slice(0, 128);
