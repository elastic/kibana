/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_STREAMS_UNIT_STATS_COMPONENTS } from '@kbn/streams-schema';
import type { StreamsUnit } from '@kbn/streams-schema';
import { chunk } from 'lodash';
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
 * A component is due when it has no value, when its request is in flight (a new batch replaces
 * that request, so its components go in the new one), or when its value is old.
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
 * The due components, split in chunks of the request limit. Every batch is for the same window,
 * the one the caller resolved for this flush. A component shown by several consumers is one entry,
 * so a processor used in two slots is requested once.
 */
export const planBatches = (
  components: StatsComponents,
  window: StatsWindow,
  options: DueOptions
): StatsBatch[] =>
  chunk(
    [
      ...collectDueRefs(components.destination, 'destination', options),
      ...collectDueRefs(components.processor, 'processor', options),
    ],
    MAX_STREAMS_UNIT_STATS_COMPONENTS
  ).map((batchComponents) => ({ window, components: batchComponents }));

/**
 * A request is wanted while any of its components is still shown. The machine stops a request
 * that is no longer wanted, which aborts it.
 */
export const isBatchWanted = (
  components: StatsComponents,
  batch: Pick<StatsBatch, 'components'>
): boolean => batch.components.some((ref) => isRegistered(components, ref));
