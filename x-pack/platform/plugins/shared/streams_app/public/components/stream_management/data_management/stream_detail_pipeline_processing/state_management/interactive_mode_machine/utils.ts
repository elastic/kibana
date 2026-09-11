/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokCollection } from '@kbn/grok-ui';
import type { PipelineStepBranch, PipelineStepWithUIAttributes } from '../../types';
import { isPipelineConditionStep, isPipelineProcessorStep } from '../../types';
import type { DataSourceSimulationMode } from '../data_source_state_machine';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';
import type { StepActorRef, StepInput, StepParentActor } from '../steps_state_machine';
import { isStepUnderEdit } from '../steps_state_machine';
import type { InteractiveModeContext, InteractiveModeParentRef } from './types';
import { collectDescendantStepIds } from '../utils';

export type StepSpawner = (
  src: 'stepMachine',
  options: {
    id: string;
    input: StepInput;
  }
) => StepActorRef;

export const spawnStep = (
  step: PipelineStepWithUIAttributes,
  parentRef: StepParentActor,
  spawn: StepSpawner,
  grokCollection: GrokCollection,
  options?: { isNew: boolean; isUpdated?: boolean }
) => {
  const stepId = step.customIdentifier;
  if (typeof stepId !== 'string') {
    throw new Error('Pipeline processing step is missing a custom identifier');
  }

  return spawn('stepMachine', {
    id: stepId,
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
    .filter((snapshot) => !snapshot.matches('draft'))
    .filter(
      (snapshot) =>
        isPipelineConditionStep(snapshot.context.step) ||
        (simulationMode === 'partial' ? snapshot.context.isNew : true)
    );

  // Truncate to the selected condition subtree (and everything before it)
  if (selectedConditionId) {
    const steps = stepRefs.map((ref) => ref.getSnapshot().context.step);
    const conditionAndDescendants = collectDescendantStepIds(steps, selectedConditionId);

    conditionAndDescendants.add(selectedConditionId);

    const lastIndex = newStepSnapshots.findLastIndex((snapshot) =>
      snapshot.context.step.customIdentifier
        ? conditionAndDescendants.has(snapshot.context.step.customIdentifier)
        : false
    );

    if (lastIndex !== -1) {
      newStepSnapshots = newStepSnapshots.slice(0, lastIndex + 1);
    }
  }

  // Find if any processor is currently being edited
  const editingProcessorIndex = newStepSnapshots.findIndex(
    (snapshot) => isPipelineProcessorStep(snapshot.context.step) && isStepUnderEdit(snapshot)
  );

  // If a processor is being edited, set new processors up to and including the one being edited
  if (editingProcessorIndex !== -1) {
    newStepSnapshots = newStepSnapshots.slice(0, editingProcessorIndex + 1);
  }

  // Return processors
  return newStepSnapshots.map((snapshot) => snapshot.context.step);
}

/**
 * Checks whether any child of the given parent step is in the 'else' branch.
 */
export function stepHasElseBranch(stepRefs: StepActorRef[], parentId: string): boolean {
  return stepRefs.some((ref) => {
    const step = ref.getSnapshot()?.context.step;
    return step?.parentId === parentId && step?.branch === 'else';
  });
}

/**
 * Auto-selects a parent condition for simulation filtering when a step is created/edited
 * under a condition without an else branch. When a condition has both if and else branches,
 * all documents are covered, so filtering would not be useful.
 */
export function maybeAutoFilterByParentCondition(
  stepRefs: StepActorRef[],
  parentId: string | null | undefined,
  parentRef: InteractiveModeParentRef,
  branch?: PipelineStepBranch
): void {
  if (!parentId || branch === 'else') return;

  const parentStep = stepRefs.find((ref) => ref.id === parentId)?.getSnapshot()?.context.step;

  if (parentStep && isPipelineConditionStep(parentStep) && !stepHasElseBranch(stepRefs, parentId)) {
    parentRef.send({
      type: 'simulation.filterByConditionAuto',
      conditionId: parentId,
    });
  }
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
