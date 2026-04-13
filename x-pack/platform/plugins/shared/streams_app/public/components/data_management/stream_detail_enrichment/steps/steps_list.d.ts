import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import React from 'react';
import type { StepsProcessingSummaryMap } from '../hooks/use_steps_processing_summary';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';
import type { RootLevelMap } from '../state_management/stream_enrichment_state_machine/utils';
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
export declare const StepsListItem: (props: StepConfigurationProps) => React.JSX.Element;
