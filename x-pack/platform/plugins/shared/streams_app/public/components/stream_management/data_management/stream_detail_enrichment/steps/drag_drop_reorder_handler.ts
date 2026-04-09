/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';

/**
 * Handles drag-drop reorder by converting Atlassian's drag-drop instructions
 * into the state machine's reorder event format. Supports moving items between
 * different parent levels and nesting items inside condition blocks.
 */
export function handleDragDropReorder(params: {
  sourceStepId: string;
  targetStepId: string;
  instruction: Instruction;
  stepRefs: InteractiveModeContext['stepRefs'];
  reorderByDragDropFn: (
    sourceStepId: string,
    targetStepId: string,
    operation: 'before' | 'after' | 'inside'
  ) => void;
}): void {
  const { sourceStepId, targetStepId, instruction, stepRefs, reorderByDragDropFn } = params;

  const steps = stepRefs.map((ref) => ref.getSnapshot().context.step);

  const sourceStep = steps.find((s) => s.customIdentifier === sourceStepId);
  const targetStep = steps.find((s) => s.customIdentifier === targetStepId);

  if (!sourceStep || !targetStep) {
    return;
  }

  // Convert instruction operation to our format
  if (instruction.operation === 'reorder-before') {
    reorderByDragDropFn(sourceStepId, targetStepId, 'before');
  } else if (instruction.operation === 'reorder-after') {
    reorderByDragDropFn(sourceStepId, targetStepId, 'after');
  } else if (instruction.operation === 'combine') {
    // Nesting the source inside the target
    reorderByDragDropFn(sourceStepId, targetStepId, 'inside');
  }
}
