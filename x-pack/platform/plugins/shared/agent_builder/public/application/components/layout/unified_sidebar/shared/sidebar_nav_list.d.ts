import React from 'react';
import type { SidebarNavItem } from '../../../../route_config';
interface SidebarNavListProps {
    items: SidebarNavItem[];
    isActive: (path: string) => boolean;
    onItemClick?: () => void;
}
export declare const SidebarNavList: React.FC<SidebarNavListProps>;
export {};
