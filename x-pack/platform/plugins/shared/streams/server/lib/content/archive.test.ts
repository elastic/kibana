/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type AdmZip from 'adm-zip';
import { DecompressionBudget, assertArchiveWithinLimits } from './archive';
import { InvalidContentPackError } from './error';

// adm-zip decompression cannot run under Kibana's jsdom jest environment: a Node `Buffer` is not
// `instanceof Uint8Array` there (jsdom realm mismatch), which makes `new AdmZip(buffer)` misread
// its input and `entry.getData()` return an empty buffer. The read/inflate paths are therefore
// exercised in the deployment-agnostic api_integration tests (real Node). Here we unit-test the
// pure metadata guard, which only reads `entries.length` and `entry.header.size`.
const entry = (entryName: string, size: number): AdmZip.IZipEntry =>
  ({ entryName, header: { size } } as unknown as AdmZip.IZipEntry);

const entries = (count: number, size: number): AdmZip.IZipEntry[] =>
  Array.from({ length: count }, (_, i) => entry(`root/entry-${i}.json`, size));

describe('assertArchiveWithinLimits', () => {
  it('accepts an archive within both caps', () => {
    expect(() => assertArchiveWithinLimits(entries(10, 4 * 1024))).not.toThrow();
  });

  it('accepts an archive at the entry-count boundary (500)', () => {
    expect(() => assertArchiveWithinLimits(entries(500, 1))).not.toThrow();
  });

  it('rejects an archive with too many entries', () => {
    expect(() => assertArchiveWithinLimits(entries(501, 1))).toThrow(InvalidContentPackError);
    expect(() => assertArchiveWithinLimits(entries(501, 1))).toThrow(
      'Content pack has too many entries (max 500)'
    );
  });

  it('accepts an archive at the total-size boundary (50MB)', () => {
    // 50 entries * ~1MB = exactly 50MB across 50 entries (within the 500-entry cap).
    expect(() => assertArchiveWithinLimits(entries(50, 1024 * 1024))).not.toThrow();
  });

  it('rejects an archive whose aggregate declared size exceeds the total cap', () => {
    // 51 entries * 1MB = 51MB > 50MB, while staying under the 500-entry cap so the size cap is
    // the failing check.
    const bomb = entries(51, 1024 * 1024);
    expect(() => assertArchiveWithinLimits(bomb)).toThrow(InvalidContentPackError);
    expect(() => assertArchiveWithinLimits(bomb)).toThrow(
      'Content pack exceeds the maximum total uncompressed size of 52428800 bytes'
    );
  });

  it('checks the entry count before the total size', () => {
    // Over both caps: 501 entries each 1MB. The count message must win.
    expect(() => assertArchiveWithinLimits(entries(501, 1024 * 1024))).toThrow(
      'Content pack has too many entries (max 500)'
    );
  });
});

describe('DecompressionBudget', () => {
  const MAX = 50 * 1024 * 1024;

  it('allows reads whose running total stays within the budget', () => {
    const budget = new DecompressionBudget(MAX);
    expect(() => {
      for (let i = 0; i < 50; i++) budget.account(1024 * 1024);
    }).not.toThrow();
  });

  it('throws when the running total exceeds the budget', () => {
    const budget = new DecompressionBudget(MAX);
    for (let i = 0; i < 50; i++) budget.account(1024 * 1024);
    expect(() => budget.account(1)).toThrow(InvalidContentPackError);
  });

  it('reports the total uncompressed size message', () => {
    const budget = new DecompressionBudget(MAX);
    expect(() => budget.account(MAX + 1)).toThrow(
      'Content pack exceeds the maximum total uncompressed size of 52428800 bytes'
    );
  });

  it('accumulates across many small reads (dashboard reference fan-out)', () => {
    // Mirrors the fan-out bypass: the same ~1MB reference read 60 times sums past the budget even
    // though each individual read is well under the per-entry cap.
    const budget = new DecompressionBudget(MAX);
    expect(() => {
      for (let i = 0; i < 60; i++) budget.account(1024 * 1024);
    }).toThrow('Content pack exceeds the maximum total uncompressed size of 52428800 bytes');
  });
});
