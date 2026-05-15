import React from 'react';
export type IngestHubDemoStreamsListViewMode = 'table' | 'canvas';
export type IngestHubDemoStreamsDemoToolbarLayout = 'default' | 'pageHeader';
export interface IngestHubDemoStreamsDemoToolbarProps {
    readonly listViewMode: IngestHubDemoStreamsListViewMode;
    readonly onListViewModeChange: (mode: IngestHubDemoStreamsListViewMode) => void;
    /** When false, the toolbar has no bottom border (canvas); table view uses true. */
    readonly showToolbarBottomDivider: boolean;
    /**
     * When true, the toolbar is rendered inside a parent card: no outer background or
     * horizontal rules so the card provides the chrome.
     */
    readonly embedInCard?: boolean;
    /**
     * `pageHeader`: sits in the app chrome — transparent shell and no forced SuperDatePicker
     * control heights (avoids a cramped / “broken” calendar row next to compact controls).
     */
    readonly layout?: IngestHubDemoStreamsDemoToolbarLayout;
}
export declare function IngestHubDemoStreamsDemoToolbar({ listViewMode, onListViewModeChange, showToolbarBottomDivider, embedInCard, layout, }: IngestHubDemoStreamsDemoToolbarProps): React.JSX.Element;
