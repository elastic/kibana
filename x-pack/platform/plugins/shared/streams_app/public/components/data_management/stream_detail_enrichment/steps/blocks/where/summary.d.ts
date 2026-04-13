import React from 'react';
import type { StepConfigurationProps } from '../../steps_list';
interface WhereBlockSummaryProps extends StepConfigurationProps {
    onClick?: () => void;
}
export declare const WhereBlockSummary: ({ stepRef, rootLevelMap, stepUnderEdit, level, isFirstStepInLevel, isLastStepInLevel, readOnly, onClick, }: WhereBlockSummaryProps) => React.JSX.Element | null;
export {};
