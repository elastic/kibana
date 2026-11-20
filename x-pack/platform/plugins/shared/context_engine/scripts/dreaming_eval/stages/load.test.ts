/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeJson } from '../download';
import type { KiDump } from '../types';
import { findSharedDumps, runIdOfShared } from './load';
import { kiDumpFileOf, sampleDirOf } from './run';

const dump = (aiIndexId: string, sample?: string): KiDump => ({
  runId: 'dev-full-1',
  aiIndexId,
  ...(sample && { sample }),
  dest: `ai-index-idx-${aiIndexId}`,
  dumpedAt: '2026-11-12T08:00:00.000Z',
  workflowRuns: [],
  counts: {},
  kis: [{ id: 'fact-a', type: 'fact.preference' }],
});

describe('findSharedDumps', () => {
  let shared: string;

  beforeEach(() => {
    shared = fs.mkdtempSync(path.join(os.tmpdir(), 'dreaming-eval-shared-'));
    // A run's folder: one AI index that ran per sample, one that did not.
    writeJson(kiDumpFileOf(sampleDirOf(path.join(shared, 'chats'), 'q2')), dump('chats', 'q2'));
    writeJson(kiDumpFileOf(sampleDirOf(path.join(shared, 'chats'), 'q1')), dump('chats', 'q1'));
    writeJson(kiDumpFileOf(path.join(shared, 'portal')), dump('portal'));
  });

  afterEach(() => {
    fs.rmSync(shared, { recursive: true, force: true });
  });

  it("finds every AI index's dumps in a run's folder", () => {
    expect(findSharedDumps(shared)).toEqual([
      {
        aiIndexId: 'chats',
        runId: 'dev-full-1',
        dir: path.join(shared, 'chats'),
        samples: ['q1', 'q2'],
      },
      { aiIndexId: 'portal', runId: 'dev-full-1', dir: path.join(shared, 'portal'), samples: [] },
    ]);
    expect(runIdOfShared(shared)).toBe('dev-full-1');
  });

  it("finds one AI index's dumps in its folder, or in a lone kis.json", () => {
    expect(findSharedDumps(path.join(shared, 'chats')).map(({ samples }) => samples)).toEqual([
      ['q1', 'q2'],
    ]);
    const file = kiDumpFileOf(path.join(shared, 'portal'));
    expect(findSharedDumps(file)).toEqual([
      { aiIndexId: 'portal', runId: 'dev-full-1', dir: path.dirname(file), file, samples: [] },
    ]);
  });

  it('fails on a path that does not exist, and finds nothing in an empty folder', () => {
    expect(() => findSharedDumps(path.join(shared, 'nope'))).toThrow('Nothing to load at');
    const empty = path.join(shared, 'empty');
    fs.mkdirSync(empty);
    expect(findSharedDumps(empty)).toEqual([]);
  });
});
