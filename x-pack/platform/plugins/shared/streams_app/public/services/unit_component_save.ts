/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { findSourceLinePipelineId } from './unit_connections';
import type { ProcessingNodeRef, UnitLine } from './unit_graph';
import {
  PIPELINE_ENTRY,
  readEntryIds,
  readRoutes,
  removeOrphanedProcessors,
  replaceUnit,
} from './unit_pipeline';
import type { UnitPipeline } from './unit_pipeline';
import type { Unit } from './unit_repository';

export interface ComponentCreate {
  kind: 'source' | 'destination';
  ids: readonly string[];
}

const mergeCreatedComponents = <Component extends { id: string }>(
  base: readonly Component[],
  created: readonly Component[],
  ids: readonly string[]
): Component[] => {
  const selected = new Set(ids);
  const components = new Map(base.map((component) => [component.id, component]));
  for (const component of created) {
    if (selected.has(component.id)) {
      components.set(component.id, component);
    }
  }
  return Array.from(components.values());
};

export const applyComponentCreate = (base: Unit, created: Unit, create: ComponentCreate): Unit => {
  const { kind, ids } = create;
  return kind === 'source'
    ? replaceUnit(base, {
        sources: mergeCreatedComponents(base.unit.sources, created.unit.sources, ids),
      })
    : replaceUnit(base, {
        destinations: mergeCreatedComponents(
          base.unit.destinations,
          created.unit.destinations,
          ids
        ),
      });
};

export const PROCESSING_TRANSPLANT_FAILURE = {
  unsavedSlot: 'unsaved_slot',
  sharedProcessor: 'shared_processor',
} as const;
export type ProcessingTransplantFailure =
  (typeof PROCESSING_TRANSPLANT_FAILURE)[keyof typeof PROCESSING_TRANSPLANT_FAILURE];
export type ProcessingTransplantResult =
  | { ok: true; unit: Unit }
  | { ok: false; reason: ProcessingTransplantFailure };

const findPipeline = (unit: Unit, id: string) =>
  unit.unit.pipelines.find((pipeline) => pipeline.id === id);

export const isProcessingSlotSaved = (
  persisted: Unit,
  staged: Unit,
  { slot, line }: { slot: ProcessingNodeRef; line?: UnitLine }
): boolean => {
  if (line && findPipeline(persisted, slot.pipelineId)) {
    return false;
  }
  const id = line
    ? findSourceLinePipelineId(staged, line.sourceId, line.destinationId)
    : slot.pipelineId;
  const owner = id === undefined ? undefined : findPipeline(staged, id);
  return !!owner && isEqual(owner, findPipeline(persisted, owner.id));
};

const byId = <T extends { id: string }>(components: readonly T[]) =>
  new Map(components.map((component) => [component.id, component]));

const processorIds = ({ config }: UnitPipeline): string[] => [
  ...readEntryIds(config, PIPELINE_ENTRY.processors),
  ...readRoutes(config).flatMap((route) => route.processors ?? []),
];

/** Includes processors whose saved owner has been removed from the map. */
export const getProcessorIdsOnUnsavedPipelines = (
  saved: Unit,
  staged: Unit
): ReadonlySet<string> => {
  const previous = byId(saved.unit.pipelines);
  const current = byId(staged.unit.pipelines);
  return new Set(
    [...previous.values(), ...current.values()]
      .filter(({ id }) => !isEqual(previous.get(id), current.get(id)))
      .flatMap(processorIds)
  );
};

export const transplantProcessingDraft = ({
  persisted,
  staged,
  drafted,
}: {
  persisted: Unit;
  staged: Unit;
  drafted: Unit;
}): ProcessingTransplantResult => {
  const savedPipelines = byId(persisted.unit.pipelines);
  const stagedPipelines = byId(staged.unit.pipelines);
  const draftedPipelines = byId(drafted.unit.pipelines);
  const savedProcessors = byId(persisted.unit.processors ?? []);
  const stagedProcessors = byId(staged.unit.processors ?? []);
  const draftedProcessors = byId(drafted.unit.processors ?? []);
  const rejected = { ok: false, reason: PROCESSING_TRANSPLANT_FAILURE.unsavedSlot } as const;
  const candidates = new Set(
    [...stagedProcessors.keys()].filter((id) => !draftedProcessors.has(id))
  );
  const pipelines = new Map(savedPipelines);
  for (const id of new Set([...stagedPipelines.keys(), ...draftedPipelines.keys()])) {
    const before = stagedPipelines.get(id);
    const after = draftedPipelines.get(id);
    if (isEqual(before, after)) continue;
    if (!isEqual(before, savedPipelines.get(id))) return rejected;
    if (before) processorIds(before).forEach((processorId) => candidates.add(processorId));
    if (after) {
      pipelines.set(id, after);
    } else {
      pipelines.delete(id);
    }
  }

  const edited = new Set<string>();
  for (const [id, after] of draftedProcessors) {
    const before = stagedProcessors.get(id);
    if (isEqual(before, after)) continue;
    if (!isEqual(before, savedProcessors.get(id))) return rejected;
    if (before) edited.add(id);
    savedProcessors.set(id, after);
  }
  if (edited.size > 0) {
    const blocked = getProcessorIdsOnUnsavedPipelines(persisted, staged);
    if ([...edited].some((id) => blocked.has(id))) {
      return { ok: false, reason: PROCESSING_TRANSPLANT_FAILURE.sharedProcessor };
    }
  }
  const unit = replaceUnit(persisted, {
    pipelines: [...pipelines.values()],
    ...(savedProcessors.size || persisted.unit.processors
      ? { processors: [...savedProcessors.values()] }
      : {}),
  });
  return { ok: true, unit: removeOrphanedProcessors(unit, candidates) };
};
