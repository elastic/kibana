/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { isConditionBlock } from '@kbn/streamlang';
import { useSelector } from '@xstate5/react';
import React from 'react';
import type { StepsProcessingSummaryMap } from '../hooks/use_steps_processing_summary';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';
import type { RootLevelMap } from '../state_management/stream_enrichment_state_machine/utils';
import { ActionBlock } from './blocks/action';
import { WhereBlock } from './blocks/where';

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
  return <>{isConditionBlock(step) ? <WhereBlock {...props} /> : <ActionBlock {...props} />}</>;
};
