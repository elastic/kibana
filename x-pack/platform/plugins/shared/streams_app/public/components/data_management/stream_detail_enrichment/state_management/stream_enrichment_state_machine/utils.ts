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
    .filter((snapshot) => isWhereBlock(snapshot.context) || snapshot.context.isNew);

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
