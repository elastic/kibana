/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { isConditionBlock } from '@kbn/streamlang';
import { useSelector } from '@xstate/react';
import React from 'react';
import type { StepsProcessingSummaryMap } from '../hooks/use_steps_processing_summary';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';
import type { RootLevelMap } from '../state_management/stream_enrichment_state_machine/utils';
import { ActionBlock } from './blocks/action';
import { WhereBlock } from './blocks/where';
import { DraggableStepWrapper } from './draggable_step_wrapper';
import { useInteractiveModeSelector } from '../state_management/stream_enrichment_state_machine';

export interface StepConfigurationProps {
  stepRef: InteractiveModeContext['stepRefs'][number];
  level: number;
  rootLevelMap: RootLevelMap;
  stepUnderEdit?: StreamlangStepWithUIAttributes;
  stepsProcessingSummaryMap?: StepsProcessingSummaryMap;
  isFirstStepInLevel: boolean;
  isLastStepInLevel: boolean;
  readOnly?: boolean;
}

export const StepsListItem = (props: StepConfigurationProps) => {
  const step = useSelector(props.stepRef, (snapshot) => snapshot.context.step);
  const stepRefs = useInteractiveModeSelector((snapshot) => snapshot.context.stepRefs);
  const isCondition = isConditionBlock(step);

  // Find the index of this step in the flat stepRefs array
  const stepIndex = stepRefs.findIndex((ref) => ref.id === props.stepRef.id);

  // Don't wrap with drag-drop if read-only or under edit
  if (props.readOnly || props.stepUnderEdit) {
    return <>{isCondition ? <WhereBlock {...props} /> : <ActionBlock {...props} />}</>;
  }

  // For condition blocks, check if they have children
  const hasChildren = isCondition && step.condition?.steps && step.condition.steps.length > 0;

  // Only enable dragging if there's more than one step total
  const isDragEnabled = stepRefs.length > 1;

  return (
    <DraggableStepWrapper
      stepId={step.customIdentifier}
      index={stepIndex}
      level={props.level}
      stepRefs={stepRefs}
      // Only allow nesting (combine) inside WHERE blocks, not regular action blocks
      isBlocked={!isCondition}
      hasChildren={hasChildren}
      isDragEnabled={isDragEnabled}
    >
      {isCondition ? <WhereBlock {...props} /> : <ActionBlock {...props} />}
    </DraggableStepWrapper>
  );
};
