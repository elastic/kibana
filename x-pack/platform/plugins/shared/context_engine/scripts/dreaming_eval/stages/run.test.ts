/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import { writeJson } from '../download';
import type { DumpedKi, EvalTarget, KiDump } from '../types';
import { kiSetsOf } from './evaluate';
import {
  DREAMED_KIS_QUERY,
  dumpedSamplesOf,
  hasKiDump,
  inSpace,
  kiDumpFileOf,
  restoreDreamedKis,
  sampleDirOf,
} from './run';

const ki = (id: string): DumpedKi => ({
  id,
  type: 'fact.preference',
  title: id,
  permissions: { kibana: { privileges: [{ space: 'default' }] } },
});

const dump = (kis: DumpedKi[], sample?: string): KiDump => ({
  runId: 'run-1',
  aiIndexId: 'eval',
  ...(sample && { sample }),
  dest: 'ai-index-idx-eval',
  dumpedAt: '2026-11-12T08:00:00.000Z',
  workflowRuns: [],
  counts: {},
  kis,
});

const target = (id: string, sample?: string): EvalTarget => ({
  id,
  dataset: 'longmemeval_s',
  category: 'single-session-user',
  question: `Question ${id}?`,
  answer: 'Yes',
  ...(sample && { sample }),
});

describe('KI dumps', () => {
  let runDir: string;

  beforeEach(() => {
    runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreaming-eval-'));
  });

  afterEach(() => {
    fs.rmSync(runDir, { recursive: true, force: true });
  });

  it("pairs each sample's KIs with its targets when samples ran one at a time", () => {
    writeJson(kiDumpFileOf(sampleDirOf(runDir, 'q2')), dump([ki('fact-b')], 'q2'));
    writeJson(kiDumpFileOf(sampleDirOf(runDir, 'q1')), dump([ki('fact-a')], 'q1'));
    fs.mkdirSync(sampleDirOf(runDir, 'q3'), { recursive: true });

    expect(dumpedSamplesOf(runDir)).toEqual(['q1', 'q2']);
    expect(hasKiDump(runDir)).toBe(true);
    expect(
      kiSetsOf(runDir, [target('q1'), target('q2'), target('curated', 'q1')]).map(
        ({ sample, kis, targets }) => ({
          sample,
          kis: kis.map(({ id }) => id),
          targets: targets.map(({ id }) => id),
        })
      )
    ).toEqual([
      { sample: 'q1', kis: ['fact-a'], targets: ['q1', 'curated'] },
      { sample: 'q2', kis: ['fact-b'], targets: ['q2'] },
    ]);
  });

  it('reads one set of KIs for all targets otherwise, and fails without a dump', () => {
    expect(hasKiDump(runDir)).toBe(false);
    expect(() => kiSetsOf(runDir, [])).toThrow('No KI dump');

    writeJson(kiDumpFileOf(runDir), dump([ki('fact-a')]));

    expect(kiSetsOf(runDir, [target('q1')])).toEqual([
      { kis: [ki('fact-a')], targets: [target('q1')] },
    ]);
  });
});

describe('restoreDreamedKis', () => {
  it('deletes what dreaming wrote, then writes the dumped KIs back under their ids', async () => {
    const esClient = {
      deleteByQuery: jest.fn().mockResolvedValue({ deleted: 3 }),
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    };

    await restoreDreamedKis(
      esClient as unknown as Client,
      'ai-index-idx-eval',
      [ki('fact-a'), ki('entity-b')],
      'default'
    );

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ai-index-idx-eval', query: DREAMED_KIS_QUERY }),
      { ignore: [404] }
    );
    expect(esClient.bulk).toHaveBeenCalledWith({
      refresh: 'wait_for',
      operations: [
        { index: { _index: 'ai-index-idx-eval', _id: 'fact-a' } },
        ki('fact-a'),
        { index: { _index: 'ai-index-idx-eval', _id: 'entity-b' } },
        ki('entity-b'),
      ],
    });
  });

  it('makes the KIs visible in the space they are restored to', async () => {
    const esClient = {
      deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    };
    const everywhere = {
      ...ki('fact-b'),
      permissions: { kibana: { privileges: [{ space: '*' }] } },
    };

    await restoreDreamedKis(
      esClient as unknown as Client,
      'ai-index-idx-eval',
      [ki('fact-a'), everywhere, { id: 'fact-c', type: 'fact.preference' }],
      'team-a'
    );

    const [, restored, , kept, , bare] = esClient.bulk.mock.calls[0][0].operations;
    expect(restored.permissions).toEqual({ kibana: { privileges: [{ space: 'team-a' }] } });
    expect(kept).toEqual(everywhere);
    expect(bare).toEqual({ id: 'fact-c', type: 'fact.preference' });
    expect(inSpace(ki('fact-a'), 'default')).toEqual(ki('fact-a'));
  });

  it('fails when a KI cannot be written back', async () => {
    const esClient = {
      deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
      bulk: jest.fn().mockResolvedValue({
        errors: true,
        items: [{ index: { error: { type: 'mapper_parsing_exception' } } }],
      }),
    };

    await expect(
      restoreDreamedKis(
        esClient as unknown as Client,
        'ai-index-idx-eval',
        [ki('fact-a')],
        'default'
      )
    ).rejects.toThrow('Restoring KIs to ai-index-idx-eval failed');
  });
});
