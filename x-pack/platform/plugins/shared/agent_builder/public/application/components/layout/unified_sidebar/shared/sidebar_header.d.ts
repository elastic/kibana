import React from 'react';
interface SidebarHeaderProps {
    sidebarView: 'conversation' | 'manage';
    agentId: string;
    getNavigationPath: (newAgentId: string) => string;
    isCondensed: boolean;
    onToggleCondensed: () => void;
}
export declare const SidebarHeader: React.FC<SidebarHeaderProps>;
export {};
