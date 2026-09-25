/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import seedrandom from 'seedrandom';

/**
 * Every metric value is a pure function of `(seed, entityId, timestamp)`. Nothing is
 * carried between intervals, so a run can start anywhere in the time range, be
 * resumed, or be regenerated identically from the same seed.
 */

/** A stable uniform [0,1) for a key, without holding a generator per key. */
export const noise = (key: string, step: number): number => seedrandom(`${key}:${step}`)();

/** A stable integer in [0, max), for ids and placement rather than measurements. */
export const intFrom = (key: string, max: number): number => Math.floor(noise(key, 0) * max) % max;

/**
 * An AR(1)-flavoured multiplier around 1.0. Blending the previous step's noise into
 * the current one makes a series that wanders instead of flickering, which is what
 * makes a chart of it read as a real signal — and it stays stateless because both
 * steps are derived from the same key.
 */
export const wander = (key: string, step: number, amplitude = 0.22): number => {
  const previous = noise(key, step - 1) - 0.5;
  const current = noise(key, step) - 0.5;
  return 1 + (0.8 * previous + 0.2 * current) * amplitude;
};

/** Trough around 04:00 UTC, peak around 16:00 UTC. */
export const diurnal = (timeMs: number): number => {
  const date = new Date(timeMs);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  return 1 + 0.35 * Math.sin((2 * Math.PI * (hour - 10)) / 24);
};

export const weekly = (timeMs: number): number => {
  const day = new Date(timeMs).getUTCDay();
  return day === 0 || day === 6 ? 0.62 : 1;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Metric values carry far more precision than is useful; trim it before indexing. */
export const round = (value: number, decimals = 4): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const pick = <T>(items: readonly T[], key: string): T => items[intFrom(key, items.length)];

/** Lowercase base-36, the shape Kubernetes uses for replica set and pod suffixes. */
export const suffix = (key: string, length: number): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let index = 0; index < length; index++) {
    out += alphabet[Math.floor(noise(key, index) * alphabet.length) % alphabet.length];
  }
  return out;
};

export const hexFrom = (key: string, length: number): string => {
  let out = '';
  for (let index = 0; out.length < length; index++) {
    out += Math.floor(noise(key, index) * 0xffffffff)
      .toString(16)
      .padStart(8, '0');
  }
  return out.slice(0, length);
};

export const uuidFrom = (key: string): string => {
  const raw = hexFrom(key, 32);
  return [
    raw.slice(0, 8),
    raw.slice(8, 12),
    `4${raw.slice(13, 16)}`,
    `8${raw.slice(17, 20)}`,
    raw.slice(20, 32),
  ].join('-');
};

const DURATION = /^(\d+)(ms|s|m|h|d)$/;
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export const parseDuration = (value: string): number => {
  const match = DURATION.exec(value.trim());
  if (!match) throw new Error(`Invalid duration "${value}". Use forms like 30s, 5m, 24h, 7d.`);
  return Number(match[1]) * UNIT_MS[match[2]];
};
