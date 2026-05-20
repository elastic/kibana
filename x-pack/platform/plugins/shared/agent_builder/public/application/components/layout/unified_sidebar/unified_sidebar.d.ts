import React from 'react';
export declare const SIDEBAR_WIDTH = 300;
export declare const CONDENSED_SIDEBAR_WIDTH = 64;
interface UnifiedSidebarProps {
    isCondensed: boolean;
    onToggleCondensed: () => void;
}
export declare const UnifiedSidebar: React.FC<UnifiedSidebarProps>;
export {};
