/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { StatsWindow } from '../../../services/unit_stats_client/types';
import { hasRegistrants, isRegistered } from './stats_registration';
import type { ComponentRecord, StatsBatch, StatsComponents, StatsComponentState } from './types';

export interface DueOptions {
  now: number;
  freshnessMs: number;
  /** A refresh, a poll or a unit change: fetch even a fresh value. */
  force: boolean;
}

/**
 * A component is due when it has no value, or its value is old, or the flush is forced. A
 * component whose request is in flight (`loading`) is not due: the request is left to finish, and
 * the next flush picks up whatever it did not cover.
 */
const isDue = <TStats>(
  { entry, fetchedAt }: StatsComponentState<TStats>,
  { now, freshnessMs, force }: DueOptions
): boolean => {
  if (force || !entry) return true;
  if (entry.status === 'loading') return false;

  return fetchedAt === undefined || now - fetchedAt >= freshnessMs;
};

const collectDueRefs = <TStats>(
  record: ComponentRecord<TStats>,
  kind: StreamsUnit.StatsComponentRef['kind'],
  options: DueOptions
): StreamsUnit.StatsComponentRef[] =>
  Object.entries(record)
    .filter(([, state]) => hasRegistrants(state) && isDue(state, options))
    .map(([id]) => ({ kind, id }));

/**
 * The due components as one batch, or nothing when none is due. The window is the one the caller
 * resolved for this flush. A component shown by several consumers is one entry, so a processor
 * used in two slots is requested once. The batch can name more components than one request of the
 * route takes: the stats client splits it.
 */
export const planBatch = (
  components: StatsComponents,
  window: StatsWindow,
  options: DueOptions
): StatsBatch | undefined => {
  const due = [
    ...collectDueRefs(components.destination, 'destination', options),
    ...collectDueRefs(components.processor, 'processor', options),
  ];
  return due.length > 0 ? { window, components: due } : undefined;
};

/**
 * A request is wanted while any of its components is still shown. The machine stops a request
 * that is no longer wanted, which aborts it.
 */
export const isBatchWanted = (
  components: StatsComponents,
  batch: Pick<StatsBatch, 'components'>
): boolean => batch.components.some((ref) => isRegistered(components, ref));
