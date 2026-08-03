import React from 'react';
interface SidebarContextValue {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}
export declare const SidebarProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useSidebar: () => SidebarContextValue;
export {};
