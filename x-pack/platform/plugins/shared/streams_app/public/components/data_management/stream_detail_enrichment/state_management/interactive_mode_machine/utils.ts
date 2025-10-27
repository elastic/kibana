/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActionBlock, isWhereBlock, type StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StepActorRef, StepInput, StepParentActor } from '../steps_state_machine';
import type { InteractiveModeContext } from './types';
import { isStepUnderEdit } from '../steps_state_machine';
import type { DataSourceSimulationMode } from '../data_source_state_machine';

type StepSpawner = (
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
  options?: { isNew: boolean; isUpdated?: boolean }
) => {
  return spawn('stepMachine', {
    id: step.customIdentifier,
    input: {
      parentRef,
      step,
      isNew: options?.isNew ?? false,
      isUpdated: options?.isUpdated,
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
}: Pick<InteractiveModeContext, 'stepRefs'> & { simulationMode: DataSourceSimulationMode }) {
  let newStepSnapshots = stepRefs
    .map((procRef) => procRef.getSnapshot())
    .filter(
      (snapshot) =>
        isWhereBlock(snapshot.context.step) ||
        (simulationMode === 'partial' ? snapshot.context.isNew : true)
    );

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
