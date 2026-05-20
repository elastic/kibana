import React from 'react';
export declare function DimensionContainer({ panel, ...props }: {
    isOpen: boolean;
    handleClose: () => void;
    panel: React.ReactElement | null;
    label: string;
    isFullscreen: boolean;
    panelRef: (el: HTMLDivElement) => void;
    isInlineEditing?: boolean;
}): React.JSX.Element;
