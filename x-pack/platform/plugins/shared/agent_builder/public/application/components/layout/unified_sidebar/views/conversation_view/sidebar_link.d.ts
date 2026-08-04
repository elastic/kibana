import React from 'react';
type SidebarLinkProps = {
    label: string;
    href: string;
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    hideIcon?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>;
export declare const SidebarLink: React.FC<SidebarLinkProps>;
export {};
