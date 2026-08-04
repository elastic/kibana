import React from 'react';
import type { ApplicationConnectionsViewMode } from '../constants/types';
export interface ViewModeToggleProps {
    viewMode: ApplicationConnectionsViewMode;
    onChange: (viewMode: ApplicationConnectionsViewMode) => void;
}
export declare const ViewModeToggle: ({ viewMode, onChange }: ViewModeToggleProps) => React.JSX.Element;
