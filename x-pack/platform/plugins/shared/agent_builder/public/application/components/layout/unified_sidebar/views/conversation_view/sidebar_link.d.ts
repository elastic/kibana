import React from 'react';
interface SidebarLinkProps {
    label: string;
    href: string;
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    hideIcon?: boolean;
}
export declare const SidebarLink: React.FC<SidebarLinkProps>;
export {};
