/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { UnitStatsError } from './errors/unit_stats_error';
import { noDestinationStats } from './mappers/map_destination_stats_result';
import { noProcessorStats } from './mappers/map_processor_stats_result';
import { noSourceStats } from './mappers/map_source_stats_result';

type DestinationRef = Extract<StreamsUnit.StatsComponentRef, { kind: 'destination' }>;
type ProcessorRef = Extract<StreamsUnit.StatsComponentRef, { kind: 'processor' }>;
type SourceRef = Extract<StreamsUnit.StatsComponentRef, { kind: 'source' }>;

/** A destination to query: the ref of the request, with what the unit config says about it. */
export interface DestinationQueryRef extends DestinationRef {
  /** The destination type, which decides how its failures are read. */
  type: string;
}

/**
 * A processor to query. Nothing from the config matters to it yet, so it is the ref of the
 * request. It grows when it does, as `DestinationQueryRef` did with its type.
 */
export type ProcessorQueryRef = ProcessorRef;

/** A source to query. Like `ProcessorQueryRef`, it is the ref of the request for now. */
export type SourceQueryRef = SourceRef;

/** A component of the request that the unit has, ready to query. */
export type QueryComponentRef = DestinationQueryRef | ProcessorQueryRef | SourceQueryRef;

export interface ResolvedQueryRefs {
  /** The refs that the unit has, in the order of the request. */
  queryable: QueryComponentRef[];
  /** The refs that the unit does not have, in the order of the request. */
  unqueryable: StreamsUnit.StatsComponentRef[];
}

/**
 * Splits the refs of a request by the unit config alone, so it makes no Elasticsearch call. A ref
 * that the unit has can be queried, and any component of it, whatever its type, starts as a no data
 * result and the search fills it in when it emits metrics. A ref that the unit does not have can
 * not be queried.
 */
export const resolveQueryRefs = ({
  refs,
  unit,
}: {
  refs: StreamsUnit.StatsComponentRef[];
  unit: StreamsUnit.Configuration;
}): ResolvedQueryRefs => {
  /** The ref ready to query, or nothing when the unit does not have it. Only the lookup differs by kind. */
  const resolveFromUnit = (ref: StreamsUnit.StatsComponentRef): QueryComponentRef | undefined => {
    if (ref.kind === 'destination') {
      const destination = unit.destinations.find(({ id }) => id === ref.id);
      return destination && { ...ref, type: destination.type };
    }
    if (ref.kind === 'processor') {
      return unit.processors?.some(({ id }) => id === ref.id) ? ref : undefined;
    }
    if (ref.kind === 'source') {
      return unit.sources.some(({ id }) => id === ref.id) ? ref : undefined;
    }
    // A kind this API does not know has no query ref, and `defaultResults` gives it no result.
  };

  const queryable: QueryComponentRef[] = [];
  const unqueryable: StreamsUnit.StatsComponentRef[] = [];

  for (const ref of refs) {
    const queryRef = resolveFromUnit(ref);
    if (queryRef) {
      queryable.push(queryRef);
    } else {
      unqueryable.push(ref);
    }
  }

  return { queryable, unqueryable };
};

export interface DefaultResults {
  destinations: Record<string, StreamsUnit.StatsDestinationResult>;
  processors: Record<string, StreamsUnit.StatsProcessorResult>;
  sources: Record<string, StreamsUnit.StatsSourceResult>;
}

const refKey = ({ kind, id }: StreamsUnit.StatsComponentRef) => `${kind}:${id}`;

/**
 * The result of every ref of the request before any query runs, in the order of the request. A
 * ref that the unit has starts as no data, which stays when the stream does not exist yet or the
 * search finds nothing. A ref that the unit does not have is no data with a `not_found` error.
 */
export const defaultResults = ({
  refs,
  unqueryable,
  bucketMs,
}: {
  refs: StreamsUnit.StatsComponentRef[];
  unqueryable: StreamsUnit.StatsComponentRef[];
  bucketMs: number;
}): DefaultResults => {
  const notFoundKeys = new Set(unqueryable.map(refKey));
  const results: DefaultResults = { destinations: {}, processors: {}, sources: {} };

  for (const ref of refs) {
    const notFound = notFoundKeys.has(refKey(ref))
      ? { error: UnitStatsError.notFound(ref.kind).toStatsError() }
      : {};

    if (ref.kind === 'destination') {
      results.destinations[ref.id] = { ...noDestinationStats(bucketMs), ...notFound };
    } else if (ref.kind === 'processor') {
      results.processors[ref.id] = { ...noProcessorStats(), ...notFound };
    } else if (ref.kind === 'source') {
      results.sources[ref.id] = { ...noSourceStats(), ...notFound };
    }
    // A kind this API does not know is dropped, so a new kind never breaks a request.
  }

  return results;
};
