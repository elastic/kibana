/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Unit } from './unit_repository';
import {
  PROCESSING_SLOT_KIND,
  isProcessingSlotEditable,
  type ProcessingNodeRef,
  type UnitSignal,
} from './unit_graph';
import {
  PIPELINE_ENTRY,
  isDelegatingRoute,
  type PipelineConfig,
  type PipelineConfigEntry,
  type RouteRule,
  type UnitPipeline,
} from './unit_pipeline';

type UnitConfiguration = Unit['unit'];
export type UnitProcessor = NonNullable<UnitConfiguration['processors']>[number];
export type UnitConfigEntry = NonNullable<UnitProcessor['config']>[number];

/** A processor as staged in the flyout; `id` is unset until it is written to the unit. */
export interface DraftProcessor {
  id?: string;
  type: string;
  name?: string;
  description?: string;
  supported_telemetry: UnitSignal[];
  config: UnitConfigEntry[];
}

export const PROCESSING_DRAFT_FAILURE = {
  missingSlot: 'missing_slot',
} as const;
export type ProcessingDraftFailure =
  (typeof PROCESSING_DRAFT_FAILURE)[keyof typeof PROCESSING_DRAFT_FAILURE];

export type ProcessingDraftResult =
  | { ok: true; unit: Unit; processorIds: string[] }
  | { ok: false; reason: ProcessingDraftFailure };

const IDENTIFIER_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_IDENTIFIER_LENGTH = 256;

const replaceUnit = (unit: Unit, configuration: Partial<UnitConfiguration>): Unit => ({
  ...unit,
  unit: { ...unit.unit, ...configuration },
});

const findPipeline = (unit: Unit, pipelineId: string): UnitPipeline | undefined =>
  unit.unit.pipelines.find((pipeline) => pipeline.id === pipelineId);

const hasSources = (pipeline: UnitPipeline): boolean =>
  pipeline.config.some((entry) => entry.name === PIPELINE_ENTRY.sources);

const pipelineForwards = (pipeline: UnitPipeline): boolean =>
  pipeline.config.some(
    ({ name }) => name === PIPELINE_ENTRY.destinations || name === PIPELINE_ENTRY.routes
  );

const readRoutes = (config: PipelineConfig): RouteRule[] =>
  config.flatMap((entry) => (entry.name === PIPELINE_ENTRY.routes ? entry.value : []));

const readProcessorIds = (config: PipelineConfig): string[] =>
  config.flatMap((entry) => (entry.name === PIPELINE_ENTRY.processors ? entry.value : []));

const slotProcessorIds = (pipeline: UnitPipeline, ref: ProcessingNodeRef): string[] =>
  ref.kind === PROCESSING_SLOT_KIND.pipeline
    ? readProcessorIds(pipeline.config)
    : readRoutes(pipeline.config)[ref.routeIndex]?.processors ?? [];

const usedIds = (unit: Unit): Set<string> =>
  new Set([
    ...unit.unit.sources.map(({ id }) => id),
    ...(unit.unit.processors ?? []).map(({ id }) => id),
    ...unit.unit.destinations.map(({ id }) => id),
    ...unit.unit.pipelines.map(({ id }) => id),
  ]);

const allocateId = (stem: string, taken: Set<string>): string => {
  const base =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_IDENTIFIER_LENGTH - 8) || 'component';
  for (let suffix = 1; ; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (IDENTIFIER_PATTERN.test(candidate) && !taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
};

const referencedProcessorIds = (unit: Unit): Set<string> =>
  new Set(
    unit.unit.pipelines.flatMap((pipeline) => [
      ...readProcessorIds(pipeline.config),
      ...readRoutes(pipeline.config).flatMap((route) => route.processors ?? []),
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

const intersect = (
  signals: readonly UnitSignal[],
  subset: readonly UnitSignal[] | undefined
): UnitSignal[] => (subset ? signals.filter((signal) => subset.includes(signal)) : [...signals]);

/** The route at a slot's `routeIndex`, with the selector of the `routes` entry it sits in. */
const findRoute = (
  pipeline: UnitPipeline,
  routeIndex: number
): { route: RouteRule; entryTelemetry?: UnitSignal[] } | undefined => {
  let offset = 0;
  for (const entry of pipeline.config) {
    if (entry.name !== PIPELINE_ENTRY.routes) {
      continue;
    }
    if (routeIndex < offset + entry.value.length) {
      return { route: entry.value[routeIndex - offset], entryTelemetry: entry.telemetry };
    }
    offset += entry.value.length;
  }
  return undefined;
};

/** Signals the processors of a slot run on. */
export const getProcessingSlotTelemetry = (unit: Unit, ref: ProcessingNodeRef): UnitSignal[] => {
  const pipeline = findPipeline(unit, ref.pipelineId);
  if (!pipeline) {
    return [];
  }
  if (ref.kind === PROCESSING_SLOT_KIND.pipeline) {
    return [...pipeline.supported_telemetry];
  }
  const found = findRoute(pipeline, ref.routeIndex);
  if (!found) {
    return [];
  }
  return intersect(
    intersect(pipeline.supported_telemetry, found.entryTelemetry),
    found.route.telemetry
  );
};

/** Processor components a slot applies, in order. Ids without a component are skipped. */
export const getProcessingNodeProcessors = (
  unit: Unit,
  ref: ProcessingNodeRef
): UnitProcessor[] => {
  const pipeline = findPipeline(unit, ref.pipelineId);
  if (!pipeline) {
    return [];
  }
  const byId = new Map((unit.unit.processors ?? []).map((processor) => [processor.id, processor]));
  return slotProcessorIds(pipeline, ref).flatMap((id) => {
    const processor = byId.get(id);
    return processor ? [processor] : [];
  });
};

const updatePipeline = (
  unit: Unit,
  pipelineId: string,
  update: (pipeline: UnitPipeline) => UnitPipeline
): Unit =>
  replaceUnit(unit, {
    pipelines: unit.unit.pipelines.map((pipeline) =>
      pipeline.id === pipelineId ? update(pipeline) : pipeline
    ),
  });

const upsertProcessors = (
  unit: Unit,
  processors: readonly DraftProcessor[]
): { unit: Unit; ids: string[] } => {
  const taken = usedIds(unit);
  const existing = unit.unit.processors ?? [];
  const written: UnitProcessor[] = processors.map(
    ({ id, type, name, description, supported_telemetry, config }) => ({
      id: id ?? allocateId(type, taken),
      type,
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      supported_telemetry: [...supported_telemetry],
      ...(config.length > 0 ? { config } : {}),
    })
  );
  const writtenById = new Map(written.map((processor) => [processor.id, processor]));
  const kept = existing.map((processor) => writtenById.get(processor.id) ?? processor);
  const added = written.filter(({ id }) => !existing.some((processor) => processor.id === id));
  return {
    unit: replaceUnit(unit, { processors: [...kept, ...added] }),
    ids: written.map(({ id }) => id),
  };
};

/** Replaces the pipeline's unscoped `processors` entry, keeping it ahead of routes and destinations. */
const setPipelineProcessors = (pipeline: UnitPipeline, ids: readonly string[]): UnitPipeline => {
  const isDefaultProcessors = (entry: PipelineConfigEntry) =>
    entry.name === PIPELINE_ENTRY.processors && entry.telemetry === undefined;
  const others = pipeline.config.filter((entry) => !isDefaultProcessors(entry));
  if (ids.length === 0) {
    return { ...pipeline, config: others };
  }
  const entry: PipelineConfigEntry = { name: PIPELINE_ENTRY.processors, value: [...ids] };
  const firstOther = others.findIndex(({ name }) => name !== PIPELINE_ENTRY.sources);
  const insertAt = firstOther === -1 ? others.length : firstOther;
  return {
    ...pipeline,
    config: [...others.slice(0, insertAt), entry, ...others.slice(insertAt)],
  };
};

/** Rewrites the route at a slot's `routeIndex`, which counts across all `routes` entries. */
const mapRouteAt = (
  pipeline: UnitPipeline,
  routeIndex: number,
  update: (route: RouteRule) => RouteRule
): UnitPipeline => {
  let offset = 0;
  return {
    ...pipeline,
    config: pipeline.config.map((entry): PipelineConfigEntry => {
      if (entry.name !== PIPELINE_ENTRY.routes) {
        return entry;
      }
      const local = routeIndex - offset;
      offset += entry.value.length;
      if (local < 0 || local >= entry.value.length) {
        return entry;
      }
      return {
        ...entry,
        value: entry.value.map((route, index) => (index === local ? update(route) : route)),
      };
    }),
  };
};

const withRouteProcessors = (route: RouteRule, ids: readonly string[]): RouteRule => {
  const next: RouteRule = { ...route, processors: [...ids] };
  if (ids.length === 0) {
    delete next.processors;
  }
  return next;
};

/** Emptying an unconnected processing node removes it: a pipeline with nothing to run or forward is invalid. */
const dropIdlePipeline = (unit: Unit, pipelineId: string): Unit => {
  const pipeline = findPipeline(unit, pipelineId);
  if (!pipeline || readProcessorIds(pipeline.config).length > 0 || pipelineForwards(pipeline)) {
    return unit;
  }
  return replaceUnit(unit, {
    pipelines: unit.unit.pipelines.filter(({ id }) => id !== pipelineId),
  });
};

/**
 * Writes the flyout's processors to one slot. Fails when the slot is gone or
 * cannot be edited, so the caller does not persist a save that changed nothing.
 */
export const applyProcessingDraft = (
  unit: Unit,
  ref: ProcessingNodeRef,
  processors: readonly DraftProcessor[]
): ProcessingDraftResult => {
  const pipeline = findPipeline(unit, ref.pipelineId);
  if (!pipeline || !isProcessingSlotEditable(unit, ref)) {
    return { ok: false, reason: PROCESSING_DRAFT_FAILURE.missingSlot };
  }
  const previousIds = slotProcessorIds(pipeline, ref);
  const { unit: withProcessors, ids } = upsertProcessors(unit, processors);
  const next = updatePipeline(withProcessors, ref.pipelineId, (current) =>
    ref.kind === PROCESSING_SLOT_KIND.pipeline
      ? setPipelineProcessors(current, ids)
      : mapRouteAt(current, ref.routeIndex, (route) => withRouteProcessors(route, ids))
  );
  const kept =
    ref.kind === PROCESSING_SLOT_KIND.pipeline ? dropIdlePipeline(next, ref.pipelineId) : next;
  return { ok: true, unit: removeOrphanedProcessors(kept, previousIds), processorIds: ids };
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

export const pruneUnit = (previous: Unit, next: Unit): Unit => {
  const forwardedBefore = new Set(
    previous.unit.pipelines.filter(pipelineForwards).map(({ id }) => id)
  );
  const reachableBefore = reachablePipelineIds(previous.unit.pipelines);
  let pipelines = next.unit.pipelines;
  for (let changed = true; changed; ) {
    const ids = new Set(pipelines.map(({ id }) => id));
    const cleaned = pipelines.flatMap((pipeline) => {
      const updated = dropMissingDelegations(pipeline, ids);
      return pipelineForwards(updated) || !forwardedBefore.has(pipeline.id) ? [updated] : [];
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
