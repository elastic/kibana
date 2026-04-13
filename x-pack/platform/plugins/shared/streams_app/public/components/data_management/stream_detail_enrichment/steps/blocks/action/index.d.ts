import React from 'react';
import type { StepConfigurationProps } from '../../steps_list';
import type { ProcessorMetrics } from '../../../state_management/simulation_state_machine';
export type ActionBlockProps = StepConfigurationProps & {
    processorMetrics?: ProcessorMetrics;
};
export declare function ActionBlock(props: StepConfigurationProps): React.JSX.Element;
