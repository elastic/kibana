/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import type { AssignArgs } from 'xstate5';
import { isActionBlock, isWhereBlock } from '@kbn/streamlang/types/streamlang';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamEnrichmentContextType } from './types';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine';
import {
  convertToFieldDefinition,
  getMappedSchemaFields,
  getUnmappedSchemaFields,
} from '../simulation_state_machine';
import type {
  EnrichmentUrlState,
  KqlSamplesDataSource,
  RandomSamplesDataSource,
  CustomSamplesDataSource,
  EnrichmentDataSource,
} from '../../../../../../common/url_schema';
import { dataSourceConverter } from '../../utils';
import type { StepActorRef } from '../steps_state_machine';
import { isStepUnderEdit } from '../steps_state_machine';

export const defaultRandomSamplesDataSource: RandomSamplesDataSource = {
  type: 'random-samples',
  name: i18n.translate('xpack.streams.enrichment.dataSources.randomSamples.defaultName', {
    defaultMessage: 'Random samples',
  }),
  enabled: true,
};

export const defaultKqlSamplesDataSource: KqlSamplesDataSource = {
  type: 'kql-samples',
  name: '',
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

export const defaultCustomSamplesDataSource: CustomSamplesDataSource = {
  type: 'custom-samples',
  name: '',
  enabled: true,
  documents: [],
};

export const defaultEnrichmentUrlState: EnrichmentUrlState = {
  v: 1,
  dataSources: [defaultRandomSamplesDataSource],
};

export function getDataSourcesUrlState(context: StreamEnrichmentContextType) {
  const dataSources = context.dataSourcesRefs.map(
    (dataSourceRef) => dataSourceRef.getSnapshot().context.dataSource
  );

  return dataSources
    .filter((dataSource) => dataSource.type !== 'custom-samples') // Custom samples are not stored in the URL
    .map(dataSourceConverter.toUrlSchema);
}

export function getDataSourcesSamples(
  context: StreamEnrichmentContextType
): SampleDocumentWithUIAttributes[] {
  const dataSourcesSnapshots = context.dataSourcesRefs
    .map((dataSourceRef) => dataSourceRef.getSnapshot())
    .filter((snapshot) => snapshot.matches('enabled'));

  return dataSourcesSnapshots.flatMap((snapshot) => {
    return snapshot.context.data.map((doc) => ({
      dataSourceId: snapshot.context.dataSource.id,
      document: doc,
    }));
  });
}

/**
 * Gets processors for simulation based on current editing state.
 * - If no processor is being edited: returns all new processors
 * - If a processor is being edited: returns new processors up to and including the one being edited
 */
export function getStepsForSimulation({ stepRefs }: Pick<StreamEnrichmentContextType, 'stepRefs'>) {
  let newStepSnapshots = stepRefs
    .map((procRef) => procRef.getSnapshot())
    .filter((snapshot) => isWhereBlock(snapshot.context.step) || snapshot.context.isNew);

  // Find if any processor is currently being edited
  const editingProcessorIndex = newStepSnapshots.findIndex(
    (snapshot) => isActionBlock(snapshot.context) && isStepUnderEdit(snapshot)
  );

  // If a processor is being edited, set new processors up to and including the one being edited
  if (editingProcessorIndex !== -1) {
    newStepSnapshots = newStepSnapshots.slice(0, editingProcessorIndex + 1);
  }

  // Return processors
  return newStepSnapshots.map((snapshot) => snapshot.context.step);
}

export function getConfiguredSteps(context: StreamEnrichmentContextType) {
  return context.stepRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.matches('configured'))
    .map((proc) => proc.context.step);
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

export const spawnStep = <
  TAssignArgs extends AssignArgs<StreamEnrichmentContextType, any, any, any>
>(
  step: StreamlangStepWithUIAttributes,
  assignArgs: Pick<TAssignArgs, 'self' | 'spawn'>,
  options?: { isNew: boolean }
) => {
  const { spawn, self } = assignArgs;

  return spawn('stepMachine', {
    id: step.customIdentifier,
    input: {
      parentRef: self,
      step,
      isNew: options?.isNew ?? false,
    },
  });
};

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
      dataSource: dataSourceWithUIAttributes,
    },
  });
};

/* Find insert index based on step hierarchy */
export function findInsertIndex(stepRefs: StepActorRef[], parentId: string | null): number {
  // Find the index of the parent step
  const parentIndex = parentId ? stepRefs.findIndex((step) => step.id === parentId) : -1;

  // Find the last index of any step with the same parentId
  let lastSiblingIndex = -1;

  if (parentId !== null) {
    for (let i = 0; i < stepRefs.length; i++) {
      if (stepRefs[i].getSnapshot().context.step.parentId === parentId) {
        lastSiblingIndex = i;
      }
    }
  }

  if (lastSiblingIndex !== -1) {
    // Insert after the last sibling with the same parentId
    return lastSiblingIndex + 1;
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
  const children = collectDescendantIds(stepId, stepRefs);
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
        const candidateDescendants = collectDescendantIds(candidate.id, stepRefs);
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

export function collectDescendantIds(id: string, stepRefs: StepActorRef[]): Set<string> {
  const ids = new Set<string>();
  function collect(currentId: string) {
    stepRefs
      .filter((step) => step.getSnapshot().context.step.parentId === currentId)
      .forEach((child) => {
        ids.add(child.id);
        collect(child.id);
      });
  }
  collect(id);
  return ids;
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
