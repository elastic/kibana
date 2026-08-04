import React, { type FC, type PropsWithChildren } from 'react';
/**
 * Props for ProgressControlProps
 */
interface ProgressControlProps {
    progress: number;
    progressMessage: string;
    onRefresh: () => void;
    onCancel: () => void;
    onReset: () => void;
    isBrushCleared: boolean;
    isRunning: boolean;
    shouldRerunAnalysis: boolean;
    runAnalysisDisabled?: boolean;
    analysisInfo?: React.ReactNode;
    isAnalysisControlsDisabled?: boolean;
}
/**
 * ProgressControls React Component
 * Component with ability to run & cancel analysis
 * by default uses `Baseline` and `Deviation` for the badge name
 *
 * @param props ProgressControls component props
 * @returns The ProgressControls component.
 */
export declare const ProgressControls: FC<PropsWithChildren<ProgressControlProps>>;
export {};
