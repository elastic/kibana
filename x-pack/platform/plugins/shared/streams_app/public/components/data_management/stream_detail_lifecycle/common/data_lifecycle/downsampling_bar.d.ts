import React from 'react';
import type { DownsamplingSegment } from './data_lifecycle_segments';
export interface DownsamplingBarProps {
    segments?: DownsamplingSegment[] | null;
    gridTemplateColumns: string;
    onRemoveStep?: (stepNumber: number) => void;
    onEditStep?: (stepNumber: number, phaseName?: string) => void;
    editedPhaseName?: string;
    canManageLifecycle: boolean;
    isEditLifecycleFlyoutOpen?: boolean;
}
export declare const DownsamplingBar: ({ segments, gridTemplateColumns, onRemoveStep, onEditStep, editedPhaseName, canManageLifecycle, isEditLifecycleFlyoutOpen, }: DownsamplingBarProps) => React.JSX.Element | null;
