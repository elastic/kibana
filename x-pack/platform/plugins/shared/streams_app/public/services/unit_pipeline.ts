/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import type { Unit } from './unit_repository';

type UnitConfiguration = Unit['unit'];
export type UnitPipeline = UnitConfiguration['pipelines'][number];
export type PipelineConfig = UnitPipeline['config'];
export type PipelineConfigEntry = PipelineConfig[number];
export type PipelineEntryName = PipelineConfigEntry['name'];
export type UnitSignal = UnitPipeline['supported_telemetry'][number];

export const PIPELINE_ENTRY = {
  sources: 'sources',
  processors: 'processors',
  routes: 'routes',
  destinations: 'destinations',
} as const satisfies { [Name in PipelineEntryName]: Name };

export const DEFAULT_SUPPORTED_TELEMETRY = ['logs', 'metrics', 'traces'] as const;

export type RouteRule = Extract<
  PipelineConfigEntry,
  { name: typeof PIPELINE_ENTRY.routes }
>['value'][number];
export type DelegatingRoute = Extract<RouteRule, { pipelines: string[] }>;

/** Whether a route hands its records to child pipelines rather than to destinations. */
export const isDelegatingRoute = (route: RouteRule): route is DelegatingRoute =>
  'pipelines' in route;

type IdListEntryName = Exclude<PipelineEntryName, typeof PIPELINE_ENTRY.routes>;

/** Component ids a pipeline lists under `name`, across all of its entries with that name. */
export const readEntryIds = (config: PipelineConfig, name: IdListEntryName): string[] =>
  config.flatMap((entry) => (entry.name === name ? entry.value : []));

/** The pipeline's routes across all of its `routes` entries, in declaration order. */
export const readRoutes = (config: PipelineConfig): RouteRule[] =>
  config.flatMap((entry) => (entry.name === PIPELINE_ENTRY.routes ? entry.value : []));

/**
 * Whether `sources`, `destinations` or `routes` are split into telemetry-scoped
 * entries. Line edits merge the entries of one name, so these pipelines are
 * left as they are.
 */
export const hasScopedWiring = (config: PipelineConfig): boolean =>
  config.some((entry) => entry.telemetry !== undefined && entry.name !== PIPELINE_ENTRY.processors);

export const pipelineForwards = (config: PipelineConfig): boolean =>
  config.some(({ name }) => name === PIPELINE_ENTRY.destinations || name === PIPELINE_ENTRY.routes);

/** `current` followed by the signals of `added` it does not have yet. */
export const unionSignals = (
  current: readonly UnitSignal[],
  added: readonly UnitSignal[]
): UnitSignal[] => [...current, ...added.filter((signal) => !current.includes(signal))];

/** Signals in both lists; an unset `subset` selects every signal. */
export const intersectSignals = (
  signals: readonly UnitSignal[],
  subset: readonly UnitSignal[] | undefined
): UnitSignal[] => (subset ? signals.filter((signal) => subset.includes(signal)) : [...signals]);

export const replaceUnit = (unit: Unit, configuration: Partial<UnitConfiguration>): Unit => ({
  ...unit,
  unit: { ...unit.unit, ...configuration },
});

/** Ids are shared by every component kind and pipeline in a unit. */
export const usedComponentIds = (unit: Unit): Set<string> =>
  new Set([
    ...unit.unit.sources.map(({ id }) => id),
    ...(unit.unit.processors ?? []).map(({ id }) => id),
    ...unit.unit.destinations.map(({ id }) => id),
    ...unit.unit.pipelines.map(({ id }) => id),
  ]);

/**
 * Allocates a valid identifier derived from `stem` that is not in `taken`, and
 * marks it taken. With `bareFirst` the stem itself is tried before `-2`, `-3`, …;
 * otherwise numbering starts at `-1`.
 */
export const allocateComponentId = (
  stem: string,
  taken: Set<string>,
  { bareFirst = false }: { bareFirst?: boolean } = {}
): string => {
  const maxLength = streamsUnitIdentifierSchema.maxLength ?? 256;
  const base =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'component';
  const withTail = (tail: string) =>
    `${base.slice(0, maxLength - tail.length).replace(/-+$/g, '')}${tail}`;
  const claimIfFree = (candidate: string): string | undefined => {
    if (taken.has(candidate) || !streamsUnitIdentifierSchema.safeParse(candidate).success) {
      return undefined;
    }
    taken.add(candidate);
    return candidate;
  };
  const bare = bareFirst ? claimIfFree(withTail('')) : undefined;
  if (bare) {
    return bare;
  }
  for (let suffix = bareFirst ? 2 : 1; ; suffix++) {
    const claimed = claimIfFree(withTail(`-${suffix}`));
    if (claimed) {
      return claimed;
    }
  }
};

const hasSources = (pipeline: UnitPipeline): boolean =>
  pipeline.config.some((entry) => entry.name === PIPELINE_ENTRY.sources);

const referencedProcessorIds = (unit: Unit): Set<string> =>
  new Set(
    unit.unit.pipelines.flatMap(({ config }) => [
      ...readEntryIds(config, PIPELINE_ENTRY.processors),
      ...readRoutes(config).flatMap((route) => route.processors ?? []),
    ])
  );

/** Drops processor components among `candidates` that nothing references any more. */
const removeOrphanedProcessors = (unit: Unit, candidates: Iterable<string>): Unit => {
  const referenced = referencedProcessorIds(unit);
  const orphaned = new Set([...candidates].filter((id) => !referenced.has(id)));
  if (orphaned.size === 0 || !unit.unit.processors) {
    return unit;
  }
  return replaceUnit(unit, {
    processors: unit.unit.processors.filter(({ id }) => !orphaned.has(id)),
  });
};

const reachablePipelineIds = (pipelines: readonly UnitPipeline[]): Set<string> => {
  const byId = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]));
  const reachable = new Set<string>();
  const queue = pipelines.filter(hasSources).map(({ id }) => id);
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || reachable.has(id)) {
      continue;
    }
    reachable.add(id);
    const pipeline = byId.get(id);
    for (const route of pipeline ? readRoutes(pipeline.config) : []) {
      if (isDelegatingRoute(route)) {
        queue.push(...route.pipelines);
      }
    }
  }
  return reachable;
};

/** Drops route delegations to pipelines that no longer exist, and routes left without targets. */
const dropMissingDelegations = (
  pipeline: UnitPipeline,
  pipelineIds: ReadonlySet<string>
): UnitPipeline => ({
  ...pipeline,
  config: pipeline.config.flatMap((entry): PipelineConfigEntry[] => {
    if (entry.name !== PIPELINE_ENTRY.routes) {
      return [entry];
    }
    const routes = entry.value.flatMap((route): RouteRule[] => {
      if (!isDelegatingRoute(route)) {
        return [route];
      }
      const remaining = route.pipelines.filter((id) => pipelineIds.has(id));
      return remaining.length > 0 ? [{ ...route, pipelines: remaining }] : [];
    });
    return routes.length > 0 ? [{ ...entry, value: routes }] : [];
  }),
});

/**
 * Cleans up after a change from `previous` to `next`: pipelines that stopped
 * forwarding or that no source reaches any more are dropped, with the
 * processors only they used.
 */
export const pruneUnit = (previous: Unit, next: Unit): Unit => {
  const forwardedBefore = new Set(
    previous.unit.pipelines.filter(({ config }) => pipelineForwards(config)).map(({ id }) => id)
  );
  const reachableBefore = reachablePipelineIds(previous.unit.pipelines);
  let pipelines = next.unit.pipelines;
  for (let changed = true; changed; ) {
    const ids = new Set(pipelines.map(({ id }) => id));
    const cleaned = pipelines.flatMap((pipeline) => {
      const updated = dropMissingDelegations(pipeline, ids);
      return pipelineForwards(updated.config) || !forwardedBefore.has(pipeline.id) ? [updated] : [];
    });
    const reachable = reachablePipelineIds(cleaned);
    const pruned = cleaned.filter(({ id }) => reachable.has(id) || !reachableBefore.has(id));
    changed = !isEqual(pruned, pipelines);
    pipelines = pruned;
  }
  const withPipelines = isEqual(pipelines, next.unit.pipelines)
    ? next
    : replaceUnit(next, { pipelines });
  return removeOrphanedProcessors(withPipelines, referencedProcessorIds(previous));
};
