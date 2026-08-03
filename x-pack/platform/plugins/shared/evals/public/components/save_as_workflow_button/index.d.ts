import React from 'react';
import type { RunExperimentRequest } from '../../../common/experiments/run_experiment';
export interface SaveAsWorkflowButtonProps {
    request: RunExperimentRequest;
    size?: 's' | 'm';
}
export declare const SaveAsWorkflowButton: React.FC<SaveAsWorkflowButtonProps>;
