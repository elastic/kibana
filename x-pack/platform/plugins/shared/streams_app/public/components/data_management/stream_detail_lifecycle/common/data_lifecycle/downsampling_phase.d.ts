import React from 'react';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
interface DownsamplingPhaseProps {
    downsample: DownsampleStep;
    stepNumber: number;
    phaseName?: string;
    color?: string;
    onRemoveStep?: (stepNumber: number) => void;
    onEditStep?: (stepNumber: number, phaseName?: string) => void;
    isBeingEdited?: boolean;
    canManageLifecycle: boolean;
    isEditLifecycleFlyoutOpen?: boolean;
}
export declare const DownsamplingPhase: ({ downsample, stepNumber, phaseName, color, onRemoveStep, onEditStep, isBeingEdited, canManageLifecycle, isEditLifecycleFlyoutOpen, }: DownsamplingPhaseProps) => React.JSX.Element;
export {};
