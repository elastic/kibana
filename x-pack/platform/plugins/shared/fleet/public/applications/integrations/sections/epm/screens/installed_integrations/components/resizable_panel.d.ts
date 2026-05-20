import React from 'react';
export declare const ResizablePanelComponent: React.FunctionComponent<{
    topBar: React.ReactNode;
    children: React.ReactNode;
    isCollapsed: boolean;
}>;
export declare const ResizablePanel: React.FunctionComponent<{
    title: React.ReactNode;
    content: React.ReactNode;
    onClose: () => void;
}>;
