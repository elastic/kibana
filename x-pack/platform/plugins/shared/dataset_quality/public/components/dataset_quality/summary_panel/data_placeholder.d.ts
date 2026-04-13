import React from 'react';
interface DataPlaceholderParams {
    title: string;
    tooltip: string;
    value: string | number;
    isLoading: boolean;
    isUserAuthorizedForDataset: boolean;
}
export declare function DataPlaceholder({ title, tooltip, value, isLoading, isUserAuthorizedForDataset, }: DataPlaceholderParams): React.JSX.Element;
export {};
