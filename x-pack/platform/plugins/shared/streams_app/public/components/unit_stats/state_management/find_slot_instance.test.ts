/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessingNodeRef } from '../../../services/unit_graph';
import type {
  ProcessorInstanceStatsView,
  ProcessorStatsView,
} from '../../../services/unit_stats_client/types';
import { findSlotInstance } from './find_slot_instance';

const instance = (
  pipelineId: string,
  routeIndex: number | null,
  eventsRate: number
): ProcessorInstanceStatsView => ({
  pipelineId,
  routeIndex,
  eventsRate,
  failedRate: null,
  durationAverage: 0.008,
});

const pipelineSlot = (pipelineId: string): ProcessingNodeRef => ({ kind: 'pipeline', pipelineId });
const routeSlot = (pipelineId: string, routeIndex: number): ProcessingNodeRef => ({
  kind: 'route',
  pipelineId,
  routeIndex,
});

// One processor, used in the entry pipeline, in two of its routes, and in another pipeline.
const REUSED: ProcessorStatsView = {
  instances: [
    instance('main', null, 100),
    instance('main', 0, 200),
    instance('main', 1, 300),
    instance('child', null, 400),
  ],
};

describe('findSlotInstance', () => {
  it.each<[string, ProcessingNodeRef, number]>([
    ['a pipeline slot is the instance without a route index', pipelineSlot('main'), 100],
    ['a route slot is the instance with its route index', routeSlot('main', 0), 200],
    ['another route of the same pipeline has its own instance', routeSlot('main', 1), 300],
    ['a slot of another pipeline has its own instance', pipelineSlot('child'), 400],
  ])('%s', (_description, ref, expectedRate) => {
    expect(findSlotInstance(REUSED, ref)?.eventsRate).toBe(expectedRate);
  });

  it('gives each slot that lists the same processor its own numbers', () => {
    const rates = [pipelineSlot('main'), routeSlot('main', 0), routeSlot('main', 1)].map(
      (ref) => findSlotInstance(REUSED, ref)?.eventsRate
    );

    expect(new Set(rates).size).toBe(3);
  });

  it.each<[string, ProcessorStatsView | undefined, ProcessingNodeRef]>([
    ['there are no stats yet', undefined, pipelineSlot('main')],
    ['the processor has no instances', { instances: [] }, pipelineSlot('main')],
    ['no instance is in that pipeline', REUSED, pipelineSlot('missing')],
    ['no instance has that route index', REUSED, routeSlot('main', 5)],
    [
      'a route slot would only match a pipeline instance',
      { instances: [instance('main', null, 1)] },
      routeSlot('main', 0),
    ],
    [
      'a pipeline slot would only match a route instance',
      { instances: [instance('main', 0, 1)] },
      pipelineSlot('main'),
    ],
  ])('finds nothing when %s', (_description, stats, ref) => {
    expect(findSlotInstance(stats, ref)).toBeUndefined();
  });

  it('returns the first instance when two match', () => {
    const stats: ProcessorStatsView = {
      instances: [instance('main', null, 10), instance('main', null, 20)],
    };

    expect(findSlotInstance(stats, pipelineSlot('main'))?.eventsRate).toBe(10);
  });
});
