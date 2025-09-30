/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from '@xstate5/react';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { isWhereBlock } from '@kbn/streamlang';
import { ActionBlock } from './blocks/action';
import type { StreamEnrichmentContextType } from '../state_management/stream_enrichment_state_machine';
import { WhereBlock } from './blocks/where';
import type { RootLevelMap } from '../state_management/stream_enrichment_state_machine/utils';
import type { StepsProcessingSummaryMap } from '../state_management/use_steps_processing_summary';

export interface StepConfigurationProps {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
  level: number;
  rootLevelMap: RootLevelMap;
  stepUnderEdit?: StreamlangStepWithUIAttributes;
  stepsProcessingSummaryMap?: StepsProcessingSummaryMap;
  isFirstStepInLevel: boolean;
  isLastStepInLevel: boolean;
}

export const StepsListItem = (props: StepConfigurationProps) => {
  const step = useSelector(props.stepRef, (snapshot) => snapshot.context.step);
  return <>{isWhereBlock(step) ? <WhereBlock {...props} /> : <ActionBlock {...props} />}</>;
};
