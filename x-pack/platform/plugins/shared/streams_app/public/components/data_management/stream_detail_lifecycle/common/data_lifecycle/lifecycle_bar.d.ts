import React from 'react';
import type { LifecyclePhase } from './lifecycle_types';
export interface LifecycleBarProps {
    phases: LifecyclePhase[];
    gridTemplateColumns: string;
    phaseColumnSpans: number[];
    onPhaseClick?: (phase: LifecyclePhase, index: number) => void;
    testSubjPrefix?: string;
    showPhaseActions?: boolean;
    onRemovePhase?: (phaseName: string) => void;
    onEditPhase?: (phaseName: string) => void;
    editedPhaseName?: string;
    canManageLifecycle: boolean;
    isEditLifecycleFlyoutOpen?: boolean;
}
export declare const LifecycleBar: React.FC<LifecycleBarProps>;
