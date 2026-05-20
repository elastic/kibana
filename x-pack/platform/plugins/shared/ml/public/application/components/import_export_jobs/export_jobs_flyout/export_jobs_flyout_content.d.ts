import React from 'react';
import type { JobType } from '@kbn/ml-common-types/saved_objects';
export interface ExportJobsFlyoutContentProps {
    currentTab: JobType;
    isADEnabled: boolean;
    isDFAEnabled: boolean;
    onClose: () => void;
}
export declare const ExportJobsFlyoutContent: ({ currentTab, isADEnabled, isDFAEnabled, onClose, }: ExportJobsFlyoutContentProps) => React.JSX.Element;
