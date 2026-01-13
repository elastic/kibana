/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  extractInstruction,
  type Instruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';

interface DragDropMonitorProps {
  stepRefs: InteractiveModeContext['stepRefs'];
  onReorder: (params: {
    sourceStepId: string;
    targetStepId: string;
    instruction: Instruction;
  }) => void;
}

export const DragDropMonitor = ({ stepRefs, onReorder }: DragDropMonitorProps) => {
  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceStepId = source.data.stepId as string;
        const targetStepId = target.data.stepId as string;

        if (sourceStepId === targetStepId) return;

        const instruction = extractInstruction(target.data);
        if (!instruction) return;
        if (instruction.blocked) return;

        onReorder({ sourceStepId, targetStepId, instruction });
      },
    });
  }, [stepRefs, onReorder]);

  return null;
};
