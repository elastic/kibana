import React from 'react';
import type { StepsProcessingSummaryMap } from '../../../hooks/use_steps_processing_summary';
export declare const NestedChildrenProcessingSummary: ({ childIds, stepsProcessingSummaryMap, }: {
    childIds: Set<string>;
    stepsProcessingSummaryMap: StepsProcessingSummaryMap | undefined;
}) => React.JSX.Element | null;
