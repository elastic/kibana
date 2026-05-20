import React from 'react';
export interface FrameLayoutProps {
    dataPanel: React.ReactNode;
    configPanel?: React.ReactNode;
    suggestionsPanel?: React.ReactNode;
    workspacePanel?: React.ReactNode;
    bannerMessages?: React.ReactNode;
}
export declare function FrameLayout(props: FrameLayoutProps): React.JSX.Element;
