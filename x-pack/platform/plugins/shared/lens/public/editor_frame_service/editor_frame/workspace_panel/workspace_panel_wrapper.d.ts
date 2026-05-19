import React from 'react';
import type { ChartSizeSpec } from '@kbn/chart-expressions-common';
import type { UserMessagesGetter } from '@kbn/lens-common';
export declare const AUTO_APPLY_DISABLED_STORAGE_KEY = "autoApplyDisabled";
export interface WorkspacePanelWrapperProps {
    children: React.ReactNode | React.ReactNode[];
    isFullscreen: boolean;
    getUserMessages: UserMessagesGetter;
    displayOptions: ChartSizeSpec | undefined;
}
export declare function WorkspacePanelWrapper({ children, isFullscreen, getUserMessages, displayOptions, }: WorkspacePanelWrapperProps): React.JSX.Element;
