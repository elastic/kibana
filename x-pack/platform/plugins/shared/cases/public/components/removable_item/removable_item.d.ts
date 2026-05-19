import React from 'react';
interface Props {
    tooltipContent: string;
    buttonAriaLabel: string;
    onRemoveItem: () => void;
    children: React.ReactNode;
    dataTestSubjPrefix?: string;
}
export declare const RemovableItem: React.NamedExoticComponent<Props>;
export {};
