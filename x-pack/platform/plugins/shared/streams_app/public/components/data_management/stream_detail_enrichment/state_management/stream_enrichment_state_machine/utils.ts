/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { v4 as uuidv4 } from 'uuid';
import type { AssignArgs } from 'xstate';
import type {
  CustomSamplesDataSource,
  EnrichmentDataSource,
  EnrichmentUrlState,
  FailureStoreDataSource,
  KqlSamplesDataSource,
  LatestSamplesDataSource,
} from '../../../../../../common/url_schema';
import { CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX } from '../../../../../../common/url_schema/common';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
import { DATA_SOURCES_I18N } from '../../data_sources_flyout/translations';
import { dataSourceConverter } from '../../utils';
import type { DataSourceActorRef, DataSourceSimulationMode } from '../data_source_state_machine';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine';
import {
  convertToFieldDefinition,
  getMappedSchemaFields,
  getUnmappedSchemaFields,
} from '../simulation_state_machine';
import type { StepActorRef } from '../steps_state_machine';
import { collectDescendantStepIds } from '../utils';
import type { StreamEnrichmentContextType } from './types';

export const defaultLatestSamplesDataSource: LatestSamplesDataSource = {
  type: 'latest-samples',
  name: DATA_SOURCES_I18N.latestSamples.defaultName,
  enabled: true,
};

export const defaultKqlSamplesDataSource: KqlSamplesDataSource = {
  type: 'kql-samples',
  name: DATA_SOURCES_I18N.kqlDataSource.defaultName,
  enabled: true,
  timeRange: {
    from: 'now-15m',
    to: 'now',
  },
  filters: [],
  query: {
    language: 'kuery',
    query: '',
  },
};

export const createDefaultCustomSamplesDataSource = (
  streamName: string
): CustomSamplesDataSource => ({
  type: 'custom-samples',
  name: DATA_SOURCES_I18N.customSamples.defaultName,
  enabled: true,
  documents: [],
  storageKey: `${CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX}${streamName}__${uuidv4()}`,
});

export const createFailureStoreDataSource = (streamName: string): FailureStoreDataSource => ({
  type: 'failure-store',
  name: DATA_SOURCES_I18N.failureStore.defaultName,
  enabled: true,
});

export const defaultEnrichmentUrlState: EnrichmentUrlState = {
  v: 1,
  dataSources: [defaultLatestSamplesDataSource],
};

export function getDataSourcesUrlState(context: StreamEnrichmentContextType) {
  const dataSources = context.dataSourcesRefs.map(
    (dataSourceRef) => dataSourceRef.getSnapshot().context.dataSource
  );

  return dataSources
    .map((dataSource) =>
      // Don't persist custom samples documents
      dataSource.type === 'custom-samples' ? { ...dataSource, documents: [] } : dataSource
    )
    .map(dataSourceConverter.toUrlSchema);
}

export function getActiveDataSourceSamples(
  context: StreamEnrichmentContextType
): SampleDocumentWithUIAttributes[] {
  const dataSourceSnapshot = context.dataSourcesRefs
    .map((dataSourceRef) => dataSourceRef.getSnapshot())
    .find((snapshot) => snapshot.matches('enabled'));

  if (!dataSourceSnapshot) return [];

  return dataSourceSnapshot.context.data.map((doc) => ({
    dataSourceId: dataSourceSnapshot.context.dataSource.id,
    document: doc,
  }));
}

export function getUpsertFields(context: StreamEnrichmentContextType): FieldDefinition | undefined {
  if (!context.simulatorRef) {
    return undefined;
  }

  const originalFieldDefinition = {
    ...(Streams.WiredStream.GetResponse.is(context.definition)
      ? context.definition.stream.ingest.wired.fields
      : context.definition.stream.ingest.classic.field_overrides),
  };

  const { detectedSchemaFields } = context.simulatorRef.getSnapshot().context;

  // Remove unmapped fields from original definition
  const unmappedSchemaFields = getUnmappedSchemaFields(detectedSchemaFields);
  unmappedSchemaFields.forEach((field) => {
    delete originalFieldDefinition[field.name];
  });

  const mappedSchemaFields = getMappedSchemaFields(detectedSchemaFields);

  const simulationMappedFieldDefinition = convertToFieldDefinition(mappedSchemaFields);

  return { ...originalFieldDefinition, ...simulationMappedFieldDefinition };
}

export const spawnDataSource = <
  TAssignArgs extends AssignArgs<StreamEnrichmentContextType, any, any, any>
>(
  dataSource: EnrichmentDataSource,
  assignArgs: TAssignArgs
) => {
  const { spawn, context, self } = assignArgs;
  const dataSourceWithUIAttributes = dataSourceConverter.toUIDefinition(dataSource);

  return spawn('dataSourceMachine', {
    id: dataSourceWithUIAttributes.id,
    input: {
      parentRef: self,
      streamName: context.definition.stream.name,
      streamType: getStreamTypeFromDefinition(context.definition.stream),
      dataSource: dataSourceWithUIAttributes,
    },
  });
};

/**
 * Recursively finds a place for a new place step for a step with given parent step.
 * Takes into account nested conditions and their descendants.
 */
function findNewSiblingStepIndex(stepRefs: StepActorRef[], parentId: string): number {
  const steps = stepRefs.map((ref) => ref.getSnapshot().context.step);
  const descendantStepIds = collectDescendantStepIds(steps, parentId);
  const lastDescendantId = Array.from(descendantStepIds).at(-1);

  const lastDescendantIndex = stepRefs.findIndex((stepRef) => {
    return stepRef.getSnapshot().context.step.customIdentifier === lastDescendantId;
  });

  if (lastDescendantIndex !== -1) {
    return lastDescendantIndex + 1;
  }

  return -1;
}

/* Find insert index based on step hierarchy */
export function findInsertIndex(stepRefs: StepActorRef[], parentId: string | null): number {
  // Find the index of the parent step
  const parentIndex = parentId ? stepRefs.findIndex((step) => step.id === parentId) : -1;

  // Find the last index of any step with the same parentId
  let newSiblingIndex = -1;

  if (parentId !== null) {
    newSiblingIndex = findNewSiblingStepIndex(stepRefs, parentId);
  }

  if (newSiblingIndex !== -1) {
    // Insert after the last sibling with the same parentId
    return newSiblingIndex;
  } else if (parentIndex !== -1) {
    // Insert right after the parent if no siblings
    return parentIndex + 1;
  } else {
    // No parent, insert at the end
    return stepRefs.length;
  }
}

export function insertAtIndex<T>(array: T[], item: T, index: number): T[] {
  return [...array.slice(0, index), item, ...array.slice(index)];
}

/**
 * Moves a contiguous block of steps (step + all descendants) up or down in the steps array.
 * This means reordering around other contiguous blocks of steps.
 * Maintains a strict index-based ordering of steps that reflects the hierarchy.
 * @param stepRefs The flat array of StepActorRef
 * @param stepId The customIdentifier of the root step to move
 * @param direction 'up' or 'down'
 * @returns A new reordered array of StepActorRef
 */
export function reorderSteps(
  stepRefs: StepActorRef[],
  stepId: string,
  direction: 'up' | 'down'
): StepActorRef[] {
  // 1. Collect all descendant ids for the block to move
  const steps = stepRefs.map((ref) => ref.getSnapshot().context.step);
  const children = collectDescendantStepIds(steps, stepId);
  const allBlockIds = new Set([stepId, ...children]);

  // 2. Find the start and end index of the block in the original array
  const startIndex = stepRefs.findIndex((step) => step.id === stepId);
  const lastChildId = Array.from(children).pop();
  const endIndex = lastChildId
    ? stepRefs.findIndex((step) => step.id === lastChildId) + 1
    : startIndex + 1;
  const block = stepRefs.slice(startIndex, endIndex);

  // 3. Remove the block from the array
  const withoutBlock = [...stepRefs.slice(0, startIndex), ...stepRefs.slice(endIndex)];

  // 4. Get the parentId of the block root
  const blockRootParentId = stepRefs[startIndex].getSnapshot().context.step.parentId;

  if (direction === 'up') {
    // Find the previous block with the same parentId
    let insertIndex = 0;
    for (let i = startIndex - 1; i >= 0; i--) {
      const candidate = stepRefs[i];
      const candidateStep = candidate.getSnapshot().context.step;
      if (!allBlockIds.has(candidate.id) && candidateStep.parentId === blockRootParentId) {
        // Find the start of this previous block in withoutBlock
        const candidateBlockStart = withoutBlock.findIndex((step) => step.id === candidate.id);
        insertIndex = candidateBlockStart;
        break;
      }
    }
    // If not found, insert at the top among siblings
    return [...withoutBlock.slice(0, insertIndex), ...block, ...withoutBlock.slice(insertIndex)];
  } else {
    // direction === 'down'
    // Find the next block with the same parentId
    let insertIndex = withoutBlock.length;
    for (let i = endIndex; i < stepRefs.length; i++) {
      const candidate = stepRefs[i];
      const candidateStep = candidate.getSnapshot().context.step;
      if (!allBlockIds.has(candidate.id) && candidateStep.parentId === blockRootParentId) {
        // Find the end of this next block in withoutBlock
        let candidateBlockEnd = withoutBlock.findIndex((step) => step.id === candidate.id);
        // Find the last descendant of this block
        const candidateDescendants = collectDescendantStepIds(steps, candidate.id);
        if (candidateDescendants.size > 0) {
          const lastDescendantId = Array.from(candidateDescendants).pop();
          const lastDescendantIdx = withoutBlock.findIndex((step) => step.id === lastDescendantId);
          if (lastDescendantIdx !== -1) {
            candidateBlockEnd = lastDescendantIdx;
          }
        }
        insertIndex = candidateBlockEnd + 1;
        break;
      }
    }
    // If not found, insert at the end among siblings
    return [...withoutBlock.slice(0, insertIndex), ...block, ...withoutBlock.slice(insertIndex)];
  }
}

/**
 * Reorders steps for drag-and-drop operations by moving a step block directly before, after, or inside a target step.
 * Supports cross-level moves and nesting items inside condition blocks.
 * ============================
 * NOTE: The parentId update is handled separately in the state machines via a step.parentChanged event.
 * This is because the inner context of the step machine needs to be updated properly via xstate.
 * This function only handles the reordering of the stepRefs array (the array order always mimics the hierarchy).
 * @param stepRefs The flat array of StepActorRef
 * @param sourceStepId The customIdentifier of the step to move
 * @param targetStepId The customIdentifier of the target step
 * @param operation Whether to insert 'before', 'after', or 'inside' the target
 * @returns A new reordered array of StepActorRef
 */
export function reorderStepsByDragDrop(
  stepRefs: StepActorRef[],
  sourceStepId: string,
  targetStepId: string,
  operation: 'before' | 'after' | 'inside'
): StepActorRef[] {
  const steps = stepRefs.map((ref) => ref.getSnapshot().context.step);

  // Find source and target steps
  const sourceIndex = stepRefs.findIndex((ref) => ref.id === sourceStepId);
  const targetIndex = stepRefs.findIndex((ref) => ref.id === targetStepId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return stepRefs;
  }

  // Prevent dropping a step onto itself or its descendants
  const sourceDescendants = collectDescendantStepIds(steps, sourceStepId);
  if (sourceDescendants.has(targetStepId)) {
    return stepRefs;
  }

  // Find the boundaries of the source block
  const sourceBlockStart = sourceIndex;
  const lastSourceDescendantId = Array.from(sourceDescendants).pop();
  const sourceBlockEnd = lastSourceDescendantId
    ? stepRefs.findIndex((ref) => ref.id === lastSourceDescendantId) + 1
    : sourceIndex + 1;
  const sourceBlock = stepRefs.slice(sourceBlockStart, sourceBlockEnd);

  // Remove source block from array
  const withoutSource = [...stepRefs.slice(0, sourceBlockStart), ...stepRefs.slice(sourceBlockEnd)];

  const updatedSourceBlock = sourceBlock;

  // Find target position in the filtered array
  const targetIndexInFiltered = withoutSource.findIndex((ref) => ref.id === targetStepId);
  if (targetIndexInFiltered === -1) {
    return stepRefs; // Target not found
  }

  // Calculate insert position
  let insertIndex: number;

  if (operation === 'inside') {
    // Insert as first child of target
    // Find where target's children start (right after target)
    insertIndex = targetIndexInFiltered + 1;
  } else if (operation === 'before') {
    // Insert before target
    insertIndex = targetIndexInFiltered;
  } else {
    // 'after' - insert after target and all its descendants
    const targetDescendants = collectDescendantStepIds(
      withoutSource.map((ref) => ref.getSnapshot().context.step),
      targetStepId
    );
    const lastTargetDescendantId = Array.from(targetDescendants).pop();
    const targetBlockEnd = lastTargetDescendantId
      ? withoutSource.findIndex((ref) => ref.id === lastTargetDescendantId) + 1
      : targetIndexInFiltered + 1;
    insertIndex = targetBlockEnd;
  }

  // Insert source block at the calculated position
  return [
    ...withoutSource.slice(0, insertIndex),
    ...updatedSourceBlock,
    ...withoutSource.slice(insertIndex),
  ];
}

export type RootLevelMap = Map<string, string>;
// Maps every step to their corresponding root level step
export function getRootLevelStepsMap(stepRefs: StepActorRef[]): Map<string, string> {
  // Build a lookup for quick access to parentId by customIdentifier
  const idToParentId = new Map<string, string | null>();
  for (const ref of stepRefs) {
    const { customIdentifier, parentId } = ref.getSnapshot().context.step;
    idToParentId.set(customIdentifier, parentId ?? null);
  }

  // For each step, walk up the parent chain to find the root ancestor
  const result = new Map<string, string>();
  for (const ref of stepRefs) {
    const currentId = ref.getSnapshot().context.step.customIdentifier;
    let parentId = idToParentId.get(currentId);

    // Walk up until we find a step with no parentId (root)
    let rootId = currentId;
    while (parentId) {
      rootId = parentId;
      parentId = idToParentId.get(rootId) ?? null;
    }

    result.set(currentId, rootId);
  }

  return result;
}

export function getActiveDataSourceRef(
  dataSourcesRefs: DataSourceActorRef[]
): DataSourceActorRef | undefined {
  return dataSourcesRefs.find((dataSourceRef) => dataSourceRef.getSnapshot().matches('enabled'));
}

export function getActiveSimulationMode(
  context: StreamEnrichmentContextType
): DataSourceSimulationMode {
  const activeDataSourceRef = getActiveDataSourceRef(context.dataSourcesRefs);
  if (!activeDataSourceRef) return 'partial';
  return activeDataSourceRef.getSnapshot().context.simulationMode;
}

export function selectDataSource(
  dataSourcesRefs: StreamEnrichmentContextType['dataSourcesRefs'],
  id: string
) {
  dataSourcesRefs.forEach((dataSourceRef) => {
    if (dataSourceRef.id === id) {
      dataSourceRef.send({ type: 'dataSource.enable' });
    } else {
      dataSourceRef.send({ type: 'dataSource.disable' });
    }
  });
}

export const canDataSourceTypeBeOutdated = (
  dataSourceType: EnrichmentDataSource['type']
): boolean => {
  switch (dataSourceType) {
    case 'latest-samples':
    case 'kql-samples':
      return true;
    default:
      return false;
  }
};
