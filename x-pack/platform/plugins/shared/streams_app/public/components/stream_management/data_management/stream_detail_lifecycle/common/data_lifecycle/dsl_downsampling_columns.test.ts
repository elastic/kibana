/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { buildDslDownsamplingColumns } from './dsl_downsampling_columns';
import { buildStablePhaseColumns } from './stable_phase_columns';
import type { LifecyclePhase } from './lifecycle_types';

const hot: LifecyclePhase = { name: 'hot', label: 'Hot', color: '#000', grow: true, min_age: '0d' };
const frozen: LifecyclePhase = {
  name: 'frozen',
  label: 'Frozen',
  color: '#000',
  grow: true,
  isFrozen: true,
  min_age: '20d',
};
const deletePhase = (minAge: string): LifecyclePhase => ({
  name: 'delete',
  label: 'delete',
  color: '#000',
  grow: false,
  isDelete: true,
  min_age: minAge,
});

const steps: DownsampleStep[] = [
  { after: '1d', fixed_interval: '1h' },
  { after: '7d', fixed_interval: '1d' },
];

const parseFr = (token: string) => Number(token.replace('fr', ''));

// Sum the leading `Nfr` tracks (the hot regions) up to the first non-hot track.
const sumHotFrTracks = (gridTemplateColumns: string, hotRegionCount: number) =>
  gridTemplateColumns
    .split(' ')
    .slice(0, hotRegionCount)
    .reduce((sum, token) => sum + parseFr(token), 0);

const canonicalTracks = (phases: LifecyclePhase[]) =>
  buildStablePhaseColumns(phases).gridTemplateColumns.split(' ');

describe('buildDslDownsamplingColumns', () => {
  it('scales the hot-region tracks to sum to the canonical hot grow (no frozen)', () => {
    const phases = [hot, deletePhase('30d')];
    const result = buildDslDownsamplingColumns(phases, steps);
    expect(result).not.toBeNull();

    // hot only (no frozen) → three hot regions from [0d, 1d, 7d, 30d].
    const hotRegionCount = 3;
    const [hotToken] = canonicalTracks(phases);
    expect(sumHotFrTracks(result!.gridTemplateColumns, hotRegionCount)).toBeCloseTo(
      parseFr(hotToken)
    );

    const tracks = result!.gridTemplateColumns.split(' ');
    expect(tracks[hotRegionCount]).toBe('0fr'); // frozen track absent
    expect(tracks[hotRegionCount + 1]).toBe('50px'); // delete track
  });

  it('reserves the frozen track at the canonical frozen grow and keeps hot summing to hot grow', () => {
    const phases = [hot, frozen, deletePhase('30d')];
    const result = buildDslDownsamplingColumns(phases, steps);
    expect(result).not.toBeNull();

    const hotRegionCount = 3; // [0d, 1d, 7d, 20d)
    const canonical = canonicalTracks(phases);
    const canonicalHot = parseFr(canonical[0]);
    const canonicalFrozen = parseFr(canonical[3]);

    const tracks = result!.gridTemplateColumns.split(' ');
    expect(sumHotFrTracks(result!.gridTemplateColumns, hotRegionCount)).toBeCloseTo(canonicalHot);
    expect(tracks[hotRegionCount]).toBe(`${canonicalFrozen}fr`);
    expect(tracks[hotRegionCount + 1]).toBe('50px');
  });

  it('assigns sequential hot column starts, then frozen and delete', () => {
    const phases = [hot, frozen, deletePhase('30d')];
    const { columnStarts } = buildDslDownsamplingColumns(phases, steps)!;

    // 3 hot regions (cols 1-3), frozen (col 4), delete (col 5).
    expect(columnStarts).toEqual([1, 2, 3, 4, 5]);
  });

  it('falls back to null when a step is hidden by retention', () => {
    const phases = [hot, deletePhase('5d')];
    const lateSteps: DownsampleStep[] = [
      { after: '1d', fixed_interval: '1h' },
      { after: '10d', fixed_interval: '1d' },
    ];
    expect(buildDslDownsamplingColumns(phases, lateSteps)).toBeNull();
  });
});
