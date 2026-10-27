/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_STREAMS_UNIT_STATS_COMPONENTS } from '@kbn/streams-schema';
import type { StreamsUnit } from '@kbn/streams-schema';
import { chunk } from 'lodash';
import { hasRegistrants, isRegistered } from './stats_registration';
import type { ComponentRecord, StatsBatch, StatsComponentState, StatsWindows } from './types';

export interface DueOptions {
  now: number;
  freshnessMs: number;
  /** A refresh, a poll or a unit change: fetch even a fresh value. */
  force: boolean;
}

/**
 * A component is due when it has no value, when its request is in flight (a new batch for the
 * window replaces that request, so its components go in the new one), or when its value is old.
 */
const isDue = <TStats>(
  { entry, fetchedAt }: StatsComponentState<TStats>,
  { now, freshnessMs, force }: DueOptions
): boolean =>
  force ||
  !entry ||
  entry.status === 'loading' ||
  fetchedAt === undefined ||
  now - fetchedAt >= freshnessMs;

const collectDueRefs = <TStats>(
  record: ComponentRecord<TStats>,
  kind: StreamsUnit.StatsComponentRef['kind'],
  options: DueOptions
): StreamsUnit.StatsComponentRef[] =>
  Object.entries(record)
    .filter(([, state]) => hasRegistrants(state) && isDue(state, options))
    .map(([id]) => ({ kind, id }));

/**
 * One batch per window, split in chunks of the request limit. A component shown by several
 * consumers is one entry, so a processor used in two slots is requested once.
 */
export const planBatches = (windows: StatsWindows, options: DueOptions): StatsBatch[] =>
  Object.entries(windows).flatMap(([windowKey, windowState]) =>
    chunk(
      [
        ...collectDueRefs(windowState.destination, 'destination', options),
        ...collectDueRefs(windowState.processor, 'processor', options),
      ],
      MAX_STREAMS_UNIT_STATS_COMPONENTS
    ).map((components) => ({ windowKey, window: windowState.window, components }))
  );

/**
 * A request is wanted while any of its components is still shown. The machine stops a request
 * that is no longer wanted, which aborts it.
 */
export const isBatchWanted = (
  windows: StatsWindows,
  { windowKey, components }: Pick<StatsBatch, 'windowKey' | 'components'>
): boolean => components.some((ref) => isRegistered(windows[windowKey], ref));
