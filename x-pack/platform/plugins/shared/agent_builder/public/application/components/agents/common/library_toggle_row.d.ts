import React from 'react';
export interface LibraryToggleRowProps {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    onToggle: (isActive: boolean) => void;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    disabledBadgeLabel?: string;
    disabledTooltipTitle?: string;
    disabledTooltipBody?: string;
}
export declare const LibraryToggleRow: React.FC<LibraryToggleRowProps>;
