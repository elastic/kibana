import type { ReactNode } from 'react';
import React from 'react';
export type ManagementTabs = Record<string, {
    content: JSX.Element;
    label: ReactNode;
}>;
export declare function Wrapper({ tabs, streamId, tab, }: {
    tabs: ManagementTabs;
    streamId: string;
    tab: string;
}): React.JSX.Element;
