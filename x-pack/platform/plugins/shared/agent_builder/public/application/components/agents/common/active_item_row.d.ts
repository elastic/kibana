import React from 'react';
export interface ActiveItemRowProps {
    id: string;
    name: string;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    isRemoving?: boolean;
    removeAriaLabel: string;
    readOnlyContent?: React.ReactNode;
    canEditAgent: boolean;
    ebtProps?: Record<string, string>;
    removeEbtProps?: Record<string, string>;
}
export declare const ActiveItemRow: React.FC<ActiveItemRowProps>;
