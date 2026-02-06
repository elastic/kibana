/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isActionBlock,
  isConditionBlock,
  type StreamlangStepWithUIAttributes,
} from '@kbn/streamlang';
import type { GrokCollection } from '@kbn/grok-ui';
import type { DataSourceSimulationMode } from '../data_source_state_machine';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';
import type { StepActorRef, StepInput, StepParentActor } from '../steps_state_machine';
import { isStepUnderEdit } from '../steps_state_machine';
import type { InteractiveModeContext } from './types';
import { collectDescendantStepIds } from '../utils';

export type StepSpawner = (
  src: 'stepMachine',
  options: {
    id: string;
    input: StepInput;
  }
) => StepActorRef;

export const spawnStep = (
  step: StreamlangStepWithUIAttributes,
  parentRef: StepParentActor,
  spawn: StepSpawner,
  grokCollection: GrokCollection,
  options?: { isNew: boolean; isUpdated?: boolean }
) => {
  return spawn('stepMachine', {
    id: step.customIdentifier,
    input: {
      parentRef,
      step,
      isNew: options?.isNew ?? false,
      isUpdated: options?.isUpdated,
      grokCollection,
    },
  });
};

/**
 * Gets processors for simulation based on current editing state.
 * - If no processor is being edited: returns all new processors
 * - If a processor is being edited: returns new processors up to and including the one being edited
 */
export function getStepsForSimulation({
  stepRefs,
  simulationMode,
  selectedConditionId,
}: Pick<InteractiveModeContext, 'stepRefs'> & {
  simulationMode: DataSourceSimulationMode;
  selectedConditionId?: string;
}) {
  let newStepSnapshots = stepRefs
    .map((procRef) => procRef.getSnapshot())
    .filter(
      (snapshot) =>
        isConditionBlock(snapshot.context.step) ||
        (simulationMode === 'partial' ? snapshot.context.isNew : true)
    );

  // Truncate to the selected condition subtree (and everything before it)
  if (selectedConditionId) {
    const steps = stepRefs.map((ref) => ref.getSnapshot().context.step);
    const conditionAndDescendants = collectDescendantStepIds(steps, selectedConditionId);

    conditionAndDescendants.add(selectedConditionId);

    const lastIndex = newStepSnapshots.findLastIndex((snapshot) =>
      conditionAndDescendants.has(snapshot.context.step.customIdentifier)
    );

    if (lastIndex !== -1) {
      newStepSnapshots = newStepSnapshots.slice(0, lastIndex + 1);
    }
  }

  // Find if any processor is currently being edited
  const editingProcessorIndex = newStepSnapshots.findIndex(
    (snapshot) => isActionBlock(snapshot.context.step) && isStepUnderEdit(snapshot)
  );

  // If a processor is being edited, set new processors up to and including the one being edited
  if (editingProcessorIndex !== -1) {
    newStepSnapshots = newStepSnapshots.slice(0, editingProcessorIndex + 1);
  }

  // Return processors
  return newStepSnapshots.map((snapshot) => snapshot.context.step);
}

export function getConfiguredSteps(context: InteractiveModeContext) {
  return context.stepRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.matches('configured'))
    .map((proc) => proc.context.step);
}

/**
 * Gets active data source samples from the parent machine context.
 * Used for pipeline suggestion to access preview documents.
 */
export function getActiveDataSourceSamplesFromParent(
  context: InteractiveModeContext
): SampleDocumentWithUIAttributes[] {
  const { dataSourcesRefs } = context.parentRef.getSnapshot().context;

  const activeDataSourceSnapshot = dataSourcesRefs
    .map((dataSourceRef) => dataSourceRef.getSnapshot())
    .find((snapshot) => snapshot.matches('enabled'));

  if (!activeDataSourceSnapshot) return [];

  return activeDataSourceSnapshot.context.data.map((doc) => ({
    dataSourceId: activeDataSourceSnapshot.context.dataSource.id,
    document: doc,
  }));
}
