import React from 'react';
import type { ProcessorMetrics } from '../../../state_management/simulation_state_machine';
type ProcessorMetricBadgesProps = ProcessorMetrics;
export declare const ProcessorMetricBadges: ({ detected_fields, failed_rate, parsed_rate, }: ProcessorMetricBadgesProps) => React.JSX.Element;
export declare const ProcessorErrors: ({ metrics }: {
    metrics: ProcessorMetrics;
}) => React.JSX.Element;
export {};
