import type { FC } from 'react';
import React from 'react';
interface OverviewFooterItemProps {
    title: string;
    description: string;
    docLink: string;
    callToAction: React.ReactNode;
}
export declare const OverviewFooterItem: FC<OverviewFooterItemProps>;
export {};
