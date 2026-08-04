import React from 'react';
import type { SaveAsWorkflowResponse } from '../../../common/experiments/run_experiment';
export interface SavedWorkflowSuccessProps {
    savedWorkflow: SaveAsWorkflowResponse;
    /** Deep link to the saved workflow; omitted when the base path is unavailable. */
    savedWorkflowHref?: string;
    isRunning: boolean;
    onRunNow: () => void;
    onClose: () => void;
}
/**
 * Success state shown after an experiment is saved as a workflow: confirms the
 * save and offers to run it now or open it in Workflows.
 */
export declare const SavedWorkflowSuccess: React.FC<SavedWorkflowSuccessProps>;
