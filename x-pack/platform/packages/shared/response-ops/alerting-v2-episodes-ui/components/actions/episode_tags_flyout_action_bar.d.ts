import React from 'react';
import type { useEuiTheme } from '@elastic/eui';
export type EpisodeTagsFlyoutActionBarTheme = ReturnType<typeof useEuiTheme>['euiTheme'];
export interface EpisodeTagsFlyoutActionBarProps {
    euiTheme: EpisodeTagsFlyoutActionBarTheme;
    totalTagCount: number;
    selectedCount: number;
    onSelectAll: () => void;
    onSelectNone: () => void;
}
export declare function EpisodeTagsFlyoutActionBar({ euiTheme, totalTagCount, selectedCount, onSelectAll, onSelectNone, }: EpisodeTagsFlyoutActionBarProps): React.JSX.Element;
