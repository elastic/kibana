import React from 'react';
import type { CasesTourStep } from './types';
export interface GuidedTourProps {
    /** Ordered steps to walk through. */
    steps: CasesTourStep[];
    /** Whether the tour is currently running. The parent owns this (and any persisted state). */
    isActive: boolean;
    /** Called when the tour completes, is skipped, or hits the anchor safety valve. */
    onFinish: () => void;
    /** Prefix for step data-test-subjs (e.g. "cases-list-tour-step"). */
    testIdPrefix: string;
    popoverWidth?: number;
}
export declare const GuidedTour: React.NamedExoticComponent<GuidedTourProps>;
