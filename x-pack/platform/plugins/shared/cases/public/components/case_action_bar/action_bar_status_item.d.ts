import React, { type ReactNode } from 'react';
interface ActionBarStatusItemProps {
    title: string | ReactNode;
    children?: ReactNode;
    dataTestSubj?: string;
}
export declare const ActionBarStatusItem: React.NamedExoticComponent<ActionBarStatusItemProps>;
export {};
