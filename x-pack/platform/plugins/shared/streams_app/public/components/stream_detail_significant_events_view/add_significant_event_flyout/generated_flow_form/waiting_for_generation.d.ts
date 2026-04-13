import React from 'react';
export declare function AiFlowWaitingForGeneration({ stopGeneration, hasInitialResults, isBeingCanceled, isSchedulingGenerationTask, }: {
    stopGeneration: () => void;
    hasInitialResults?: boolean;
    isBeingCanceled?: boolean;
    isSchedulingGenerationTask?: boolean;
}): React.JSX.Element;
