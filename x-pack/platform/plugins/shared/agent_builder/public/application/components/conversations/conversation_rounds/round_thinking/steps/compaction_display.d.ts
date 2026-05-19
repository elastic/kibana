import type { CompactionStep } from '@kbn/agent-builder-common';
import type { ReactNode } from 'react';
import React from 'react';
interface CompactionDisplayProps {
    step: CompactionStep;
    icon?: ReactNode;
    textColor?: string;
    isInProgress?: boolean;
}
export declare const CompactionDisplay: React.FC<CompactionDisplayProps>;
export {};
