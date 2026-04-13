import React from 'react';
export declare function Panel({ title, secondaryTitle, children, isLoading, }: {
    title: string;
    secondaryTitle?: React.ReactNode;
    children: React.ReactNode | React.ReactNode[];
    isLoading?: boolean;
}): React.JSX.Element;
export declare function PanelIndicator({ label, value, tooltip, isLoading, userHasPrivilege, }: {
    label: string;
    value: string | number;
    tooltip?: React.ReactElement;
    isLoading: boolean;
    userHasPrivilege?: boolean;
}): React.JSX.Element;
